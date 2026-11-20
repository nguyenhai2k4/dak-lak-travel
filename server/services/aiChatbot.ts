import crypto from 'node:crypto';
import { OpenInferenceSpanKind } from '@arizeai/openinference-semantic-conventions';
import {
  budgetMultipliers,
  companionLabels,
  plannerCatalog,
} from '../../src/data/plannerCatalog.ts';
import {
  AiChatRequest,
  AiChatResponse,
  AiCitation,
  BudgetType,
  CompanionType,
  DurationType,
  Language,
  ThemeType,
  TraceRecord,
} from '../../src/types/index.ts';
import { saveAiTrace } from './aiTraceService.ts';
import { withOpenInferenceSpan, withSessionScope } from './arizeTelemetry.ts';
import {
  getLangGraphTraceMetadata,
  runLangGraphChat,
} from './aiWorkflow/langGraphAgent.ts';
import {
  buildClarificationOptions,
  buildGroundedQaReplyDeterministic,
  isPrimaryAmenityOrInfoQuestion,
  isQuestionOrInfoRequest,
  runPhase1IntakeDeterministic,
} from './aiWorkflow/phase1Intake.ts';
import { queryRelevantPublishedPosts } from './postsService.ts';

const VALID_THEMES: ThemeType[] = ['coffee', 'culture', 'nature', 'cuisine'];
const VALID_DURATIONS: DurationType[] = ['2N1D', '3N2D', '4N3D+'];
const VALID_COMPANIONS: CompanionType[] = ['solo', 'couple', 'family', 'friends'];
const VALID_BUDGETS: BudgetType[] = ['budget', 'standard', 'luxury'];

function sanitizeTheme(val: unknown, fallback: ThemeType): ThemeType {
  return VALID_THEMES.includes(val as ThemeType) ? (val as ThemeType) : fallback;
}

function sanitizeDuration(val: unknown, fallback: DurationType): DurationType {
  return VALID_DURATIONS.includes(val as DurationType) ? (val as DurationType) : fallback;
}

function sanitizeCompanion(val: unknown, fallback: CompanionType): CompanionType {
  return VALID_COMPANIONS.includes(val as CompanionType) ? (val as CompanionType) : fallback;
}

function sanitizeBudget(val: unknown, fallback: BudgetType): BudgetType {
  return VALID_BUDGETS.includes(val as BudgetType) ? (val as BudgetType) : fallback;
}

function detectPreferencesFallback(
  rawText: string,
  current: AiChatRequest['currentState']
): AiChatResponse['preferences'] {
  const det = runPhase1IntakeDeterministic({
    message: rawText,
    lang: 'vi',
    isFollowUp: true,
    currentState: current,
  });
  return {
    duration: sanitizeDuration(det.intake.duration, current.duration),
    companion: sanitizeCompanion(det.intake.companionType, current.companion),
    budget: sanitizeBudget(det.intake.budgetTier, current.budget),
    theme: sanitizeTheme(det.intake.mainPurpose, current.theme),
  };
}

function buildCmsCitationsForQa(lang: Language, themeKey: ThemeType): AiCitation[] {
  try {
    const posts = queryRelevantPublishedPosts({ lang, themeKey, limit: 3 });
    return posts.map((p) => ({
      title: p.title,
      url: `/blog/${p.slug}`,
      snippet: p.excerpt,
      source: 'cms',
    }));
  } catch {
    return [];
  }
}

function persistTraceSafely(record: TraceRecord): void {
  try {
    saveAiTrace(record);
  } catch (err) {
    console.warn(
      '[AI Trace] Failed to persist trace:',
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Local fallback chat handler used when `GEMINI_API_KEY` is missing or Gemini requests fail.
 */
export function runLocalFallbackChat(req: AiChatRequest, reason?: string): AiChatResponse {
  const lower = req.message.toLowerCase();
  const provider = reason ? `local-fallback (${reason})` : 'local-fallback';
  const hasExplicitPlannerVerb =
    /(lên lịch|lịch trình mới|thiết kế|tạo tour|đổi sang|chuyển sang|cập nhật lịch|thêm điểm|bỏ điểm|xóa điểm|plan.*trip|create itinerary|new itinerary|muốn đi.*chơi)/i.test(
      lower
    );
  const looksLikeGeneralQuestion =
    isPrimaryAmenityOrInfoQuestion(lower) ||
    !hasExplicitPlannerVerb ||
    isQuestionOrInfoRequest(lower) ||
    /(mùa nào|thời tiết|bao giờ|tháng mấy|ở đâu|ăn gì|món gì|đặc sản|giá vé|bao xa|di chuyển|cách đi|what|when|where|which|how|weather|season|best time)/i.test(
      lower
    );

  if (looksLikeGeneralQuestion) {
    const reply = buildGroundedQaReplyDeterministic(req);

    return {
      intent: 'general_qa',
      reply,
      shouldOpenPlanner: false,
      preferences: {
        theme: req.currentState.theme,
        duration: req.currentState.duration,
        companion: req.currentState.companion,
        budget: req.currentState.budget,
      },
      resetItineraryToTheme: false,
      stopOperations: [],
      status: 'completed',
      citations: buildCmsCitationsForQa(req.lang, req.currentState.theme),
      provider,
      engine: 'langgraph',
      ...(req.draftIntake
        ? {
            draftIntake: req.draftIntake,
            ...(req.draftIntake.missingFields?.length
              ? {
                  clarificationOptions: buildClarificationOptions(
                    req.lang,
                    req.draftIntake.missingFields
                  ),
                }
              : {}),
          }
        : {}),
    };
  }

  const prefs = detectPreferencesFallback(req.message, req.currentState);
  const cat = plannerCatalog[prefs.theme];
  const bud = budgetMultipliers[prefs.budget];

  const reply =
    req.lang === 'en'
      ? `Tailored "${cat.title}" (${prefs.duration} • ${companionLabels[prefs.companion]} • ${bud.label} budget). Route tip: ${cat.routeTip}`
      : `Đã thiết kế hành trình "${cat.title}" (${prefs.duration} • ${companionLabels[prefs.companion]} • Ngân sách ${bud.label}). Mẹo tuyến đường: ${cat.routeTip}`;

  return {
    intent: 'update_itinerary',
    reply,
    shouldOpenPlanner: true,
    preferences: prefs,
    resetItineraryToTheme: true,
    stopOperations: [],
    suggestedTab: 'map',
    status: 'completed',
    provider,
    engine: 'langgraph',
  };
}

function deriveSessionId(req: AiChatRequest, fallbackTraceId: string): string {
  if (typeof req.sessionId === 'string' && req.sessionId.trim()) {
    return req.sessionId.trim();
  }
  const seedText =
    req.history?.[0]?.user?.trim() ||
    req.draftIntake?.rawUserGoal?.split(' — ')[0]?.trim() ||
    req.message?.trim();
  if (!seedText) return fallbackTraceId;
  const hash = crypto.createHash('sha1').update(`${req.lang}:${seedText}`).digest('hex').slice(0, 16);
  return `sess_${hash}`;
}

/**
 * Main entry point for `POST /api/ai/chat`.
 * Executes the compiled LangGraph `StateGraph` (`runLangGraphChat`) + runtime evaluator + SQLite trace persistence
 * + Arize AX OpenInference `AGENT` spans, falling back cleanly to `runLocalFallbackChat` on unexpected errors.
 */
export async function handleAiChat(req: AiChatRequest): Promise<AiChatResponse> {
  const traceId = crypto.randomUUID();
  const sessionId = deriveSessionId(req, traceId);
  const startedAt = Date.now();

  return withSessionScope(sessionId, () =>
    withOpenInferenceSpan(
      'daklak_ai_concierge',
      {
        kind: OpenInferenceSpanKind.AGENT,
        input: req.message,
        attributes: {
          'daklak.trace_id': traceId,
          'daklak.session_id': sessionId,
          'daklak.lang': req.lang,
          'daklak.is_follow_up': req.isFollowUp,
          'daklak.engine': 'langgraph',
        },
        formatOutput: (res) => res.reply,
        onSuccess: (span, res) => {
          span.setAttribute('daklak.intent', res.intent);
          span.setAttribute('daklak.status', res.status || 'completed');
          span.setAttribute('daklak.provider', res.provider);
          span.setAttribute('daklak.engine', res.engine || 'langgraph');
          if (res.followUpAction) {
            span.setAttribute('daklak.follow_up_action', res.followUpAction);
          }
          if (res.toolsUsed) {
            span.setAttribute('daklak.tools_used', JSON.stringify(res.toolsUsed));
          }
          if (res.graphNodesVisited) {
            span.setAttribute('daklak.graph_nodes_visited', JSON.stringify(res.graphNodesVisited));
          }
        },
      },
      async () => {
        try {
          const finalResponse = await runLangGraphChat(req, { traceId, sessionId });
          const meta = getLangGraphTraceMetadata(traceId);

          persistTraceSafely({
            traceId,
            lang: req.lang,
            userMessage: req.message,
            intent: finalResponse.intent,
            status: finalResponse.status || 'completed',
            provider: finalResponse.provider,
            intake: meta?.intake || finalResponse.draftIntake,
            capacityPlan: meta?.capacityPlan,
            budgetResult: meta?.budgetResult,
            purposeSelection: meta?.purposeSelection,
            evalResult: meta?.evalResult,
            latencyMs: Date.now() - startedAt,
            retryCount: meta?.retryCount ?? 0,
            createdAt: new Date().toISOString(),
            engine: finalResponse.engine || 'langgraph',
            toolsUsed: finalResponse.toolsUsed,
            graphNodesVisited: finalResponse.graphNodesVisited,
          });

          return finalResponse;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown AI workflow error';
          console.warn('[AI Chatbot] LangGraph pipeline failed, using local fallback:', message);
          const fallback = runLocalFallbackChat(req, 'fallback');
          fallback.traceId = traceId;
          fallback.status = 'completed';
          fallback.engine = 'langgraph';
          fallback.toolsUsed = fallback.toolsUsed || [];
          fallback.graphNodesVisited = fallback.graphNodesVisited || ['fallback'];

          persistTraceSafely({
            traceId,
            lang: req.lang,
            userMessage: req.message,
            intent: fallback.intent,
            status: 'completed',
            provider: fallback.provider,
            latencyMs: Date.now() - startedAt,
            retryCount: 0,
            createdAt: new Date().toISOString(),
            engine: 'langgraph',
            toolsUsed: fallback.toolsUsed,
            graphNodesVisited: fallback.graphNodesVisited,
          });

          return fallback;
        }
      }
    )
  );
}
