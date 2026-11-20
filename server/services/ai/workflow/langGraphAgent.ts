import crypto from 'node:crypto';
import {
  EVALUATION_ANNOTATOR_KIND,
  EVALUATION_EXPLANATION,
  EVALUATION_LABEL,
  EVALUATION_NAME,
  EVALUATION_SCORE,
  LLM_MODEL_NAME,
  LLM_PROVIDER,
  LLM_SYSTEM,
  OpenInferenceSpanKind,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  TOOL_PARAMETERS,
} from '@arizeai/openinference-semantic-conventions';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Annotation, END, MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { GEMINI_API_KEY, GEMINI_MODEL, getGeminiApiKey } from '../../../config.ts';
import { dakLakPlaceDirectory } from '../../../../src/data/places.ts';
import { sampleSchedulePresets } from '../../../../src/data/plannerCatalog.ts';
import {
  type AccommodationRecord,
  type AgenticIntent,
  type AiChatIntent,
  type AiChatRequest,
  type AiChatResponse,
  type AiCitation,
  type AiStopOperation,
  type AutoEvalResult,
  type BudgetFeasibilityResult,
  type BudgetType,
  type CapacityAndLogisticsPlan,
  type CmsPostPublic,
  type CompanionType,
  type DurationType,
  type FollowUpActionType,
  type IntakeState,
  type Language,
  type LogisticsRecord,
  type PurposeAlignedSelection,
  type QuickClarificationOption,
  type ThemeType,
} from '../../../../src/types/index.ts';
import {
  evaluatePhase5Output,
  evaluateQaOutput,
  hasElephantRidingViolation,
} from '../aiEvaluator.ts';
import { withOpenInferenceSpan } from '../arizeTelemetry.ts';
import { queryRelevantPublishedPosts } from '../../cms/postsService.ts';
import {
  searchGeneralQaWithTavily,
  searchPlacePriceWithTavily,
  type TavilyQaLookupResult,
  type TavilySearchClient,
} from '../tavilyService.ts';
import {
  classifyFollowUpAction,
  classifyFollowUpActionDeterministic,
  routeFollowUp,
} from './followUpRouter.ts';
import {
  buildClarificationOptions,
  buildGroundedQaReplyDeterministic,
  type GroundedQaContext,
  isLikelyEnglishText,
  isPrimaryAmenityOrInfoQuestion,
  isQuestionOrInfoRequest,
  loadGroundedQaContext,
  type Phase1IntakeOutput,
  resolveEffectiveQaLanguage,
  runPhase1Intake,
  runPhase1IntakeDeterministic,
} from './phase1Intake.ts';
import { runPhase2Capacity } from './phase2Capacity.ts';
import { runPhase3Budget } from './phase3Budget.ts';
import { runPhase4Purpose } from './phase4Purpose.ts';
import { runPhase5Synthesis, synthesizeDeterministicPlan } from './phase5Synthesis.ts';

export const LANGGRAPH_TOOL_NAMES = [
  'search_local_daklak_catalog',
  'search_live_web_tavily',
  'update_trip_intake',
  'plan_or_modify_itinerary',
] as const;

export type LangGraphToolName = (typeof LANGGRAPH_TOOL_NAMES)[number];

export interface LangGraphRunOptions {
  traceId?: string;
  sessionId?: string;
  enableTavily?: boolean;
  tavilyClient?: TavilySearchClient;
  tavilyLookupFn?: typeof searchPlacePriceWithTavily;
  forceSkipTavily?: boolean;
  skipSqliteUpsert?: boolean;
  stays?: AccommodationRecord[];
  logistics?: LogisticsRecord[];
  fetchFn?: typeof fetch;
}

export interface LocalCatalogSearchOutput extends GroundedQaContext {
  relevantPosts: CmsPostPublic[];
  citations: AiCitation[];
}

export interface UpdateTripIntakeToolOutput {
  intake: IntakeState;
  stopOperations: AiStopOperation[];
  clarificationOptions: QuickClarificationOption[];
  generalQaReply?: string;
  citations?: AiCitation[];
  tavilySnippets?: Array<{ title: string; url: string; content: string }>;
  tavilyAnswer?: string;
  provider: string;
}

export interface LangGraphPlannerResults {
  mode: 'full_plan' | 'follow_up' | 'modify_stops';
  followUpAction?: FollowUpActionType;
  handled: boolean;
  capacityPlan?: CapacityAndLogisticsPlan;
  budgetResult?: BudgetFeasibilityResult;
  purposeSelection?: PurposeAlignedSelection;
  response?: AiChatResponse;
}

export interface LangGraphTraceMetadata {
  traceId: string;
  sessionId: string;
  intake?: IntakeState;
  capacityPlan?: CapacityAndLogisticsPlan;
  budgetResult?: BudgetFeasibilityResult;
  purposeSelection?: PurposeAlignedSelection;
  evalResult?: AutoEvalResult;
  toolsUsed: string[];
  graphNodesVisited: string[];
  retryCount: number;
}

const VALID_THEMES: ThemeType[] = ['coffee', 'culture', 'nature', 'cuisine'];
const VALID_DURATIONS: DurationType[] = ['2N1D', '3N2D', '4N3D+'];
const VALID_COMPANIONS: CompanionType[] = ['solo', 'couple', 'family', 'friends'];
const VALID_BUDGETS: BudgetType[] = ['budget', 'standard', 'luxury'];
const VALID_INTENTS: AiChatIntent[] = ['general_qa', 'update_itinerary', 'modify_stops'];

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

function sanitizeIntent(val: unknown, fallback: AiChatIntent): AiChatIntent {
  return VALID_INTENTS.includes(val as AiChatIntent) ? (val as AiChatIntent) : fallback;
}

function dedupeCitations(citations: AiCitation[]): AiCitation[] {
  const seen = new Set<string>();
  const unique: AiCitation[] = [];
  for (const c of citations) {
    if (!c || !c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    unique.push(c);
  }
  return unique;
}

function detectStopOperationsFallback(
  message: string,
  currentDays: AiChatRequest['currentState']['days']
): AiStopOperation[] {
  const lower = message.toLowerCase();
  const swapMatch = message.match(
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+(.+?)\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+(.+)/i
  );
  const isRemove = Boolean(swapMatch) || /(bỏ|xóa|bớt|gỡ|remove|drop|delete)/i.test(lower);
  const isAdd = Boolean(swapMatch) || /(thêm|ghé|bổ sung|add|include|visit)/i.test(lower);

  const removeSourceText = swapMatch ? swapMatch[1].toLowerCase() : lower;
  const addTargetText = swapMatch ? swapMatch[2].toLowerCase() : lower;

  const ops: AiStopOperation[] = [];
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const dayNumber = dayMatch ? Number(dayMatch[1]) : undefined;

  if (isRemove) {
    for (const day of currentDays) {
      for (const slot of day.slots) {
        const titleLower = slot.title.toLowerCase();
        const keyWords = titleLower.split(/\s+/).filter((w) => w.length >= 3);
        if (
          removeSourceText.includes(titleLower) ||
          keyWords.filter((w) => removeSourceText.includes(w)).length >= 2
        ) {
          ops.push({ action: 'remove', placeTitle: slot.title, dayNumber });
          break;
        }
      }
    }
  }

  if (isAdd || !isRemove) {
    const removedTitles = new Set(
      ops.filter((o) => o.action === 'remove').map((o) => o.placeTitle.toLowerCase())
    );
    for (const place of dakLakPlaceDirectory) {
      const titleLower = place.title.toLowerCase();
      if (removedTitles.has(titleLower)) continue;

      const shortMatch =
        (titleLower.includes('dray nur') && addTargetText.includes('dray nur')) ||
        (titleLower.includes('hồ lắk') && addTargetText.includes('hồ lắk')) ||
        (titleLower.includes('yok đôn') && addTargetText.includes('yok đôn')) ||
        (titleLower.includes('ako dhông') && addTargetText.includes('ako dhông')) ||
        (titleLower.includes('tơng jú') && addTargetText.includes('tơng jú')) ||
        (titleLower.includes('ea tân') && addTargetText.includes('ea tân')) ||
        (titleLower.includes('đá voi') && addTargetText.includes('đá voi')) ||
        (titleLower.includes('bảo tàng đắk lắk') && addTargetText.includes('bảo tàng đắk lắk')) ||
        (titleLower.includes('thế giới cà phê') && addTargetText.includes('thế giới cà phê')) ||
        (titleLower.includes('trung nguyên') && addTargetText.includes('trung nguyên')) ||
        (titleLower.includes('phan đình giót') && addTargetText.includes('phan đình giót')) ||
        (titleLower.includes('bản đôn') && addTargetText.includes('bản đôn'));

      if (addTargetText.includes(titleLower) || shortMatch) {
        ops.push({
          action: isRemove && !isAdd ? 'remove' : 'add',
          placeTitle: place.title,
          dayNumber,
          time: place.time,
          period: place.period,
        });
      }
    }
  }

  return ops.slice(0, 4);
}

function buildModifyStopsReply(
  req: AiChatRequest,
  ops: AiStopOperation[],
  preferences: AiChatResponse['preferences'],
  provider: string
): AiChatResponse {
  const effectiveOps =
    ops.length > 0 ? ops : detectStopOperationsFallback(req.message, req.currentState.days);

  const summaryList = effectiveOps
    .map((op) => `${op.action === 'remove' ? '-' : '+'} ${op.placeTitle}`)
    .join(', ');

  const reply =
    effectiveOps.length > 0
      ? req.lang === 'en'
        ? `Updated your itinerary stops (${summaryList}) while keeping your current schedule intact.`
        : `Đã cập nhật điểm dừng trong lịch trình (${summaryList}) và giữ nguyên cấu trúc các ngày còn lại.`
      : req.lang === 'en'
        ? 'Could you specify the exact Đắk Lắk place name you want to add or remove from your itinerary?'
        : 'Bạn cho mình biết tên điểm dừng cụ thể muốn thêm hoặc bớt trong lịch trình hiện tại nhé!';

  return {
    intent: 'modify_stops',
    reply,
    shouldOpenPlanner: true,
    preferences,
    resetItineraryToTheme: false,
    stopOperations: effectiveOps,
    suggestedTab: 'schedule',
    status: 'completed',
    provider,
  };
}

// ============================================================================
// LangGraph State Annotation & MemorySaver Checkpointer
// ============================================================================

export const DakLakGraphStateAnnotation = Annotation.Root({
  req: Annotation<AiChatRequest>({
    reducer: (_left, right) => right,
  }),
  sessionId: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => 'default_session',
  }),
  traceId: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) =>
      (Array.isArray(left) ? left : []).concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
  intent: Annotation<AgenticIntent>({
    reducer: (_left, right) => right,
    default: () => 'general_qa',
  }),
  followUpAction: Annotation<FollowUpActionType | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  plannedTools: Annotation<LangGraphToolName[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  intake: Annotation<IntakeState | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  phase1Output: Annotation<Phase1IntakeOutput | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  clarificationOptions: Annotation<QuickClarificationOption[] | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  localContext: Annotation<LocalCatalogSearchOutput | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  tavilyContext: Annotation<TavilyQaLookupResult | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  plannerResults: Annotation<LangGraphPlannerResults | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  response: Annotation<AiChatResponse | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  toolsUsed: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  graphNodesVisited: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  evalAttempts: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  evalResult: Annotation<AutoEvalResult | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  needsEvalRetry: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  retryFeedback: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
});

export type DakLakGraphState = typeof DakLakGraphStateAnnotation.State;

let sharedCheckpointer = new MemorySaver();
const traceMetadataStore = new Map<string, LangGraphTraceMetadata>();

export function getLangGraphCheckpointer(): MemorySaver {
  return sharedCheckpointer;
}

export function clearLangGraphMemory(): void {
  sharedCheckpointer = new MemorySaver();
  traceMetadataStore.clear();
}

export function getLangGraphTraceMetadata(traceId: string): LangGraphTraceMetadata | undefined {
  return traceMetadataStore.get(traceId);
}

// ============================================================================
// 4 First-Class LangChain Structured Tools (`tool(...)` with `zod` schemas)
// ============================================================================

export function createDakLakLangGraphTools(
  context?: {
    req?: AiChatRequest;
    intake?: IntakeState;
    options?: LangGraphRunOptions;
  }
) {
  const defaultReq: AiChatRequest = context?.req || {
    message: '',
    lang: 'vi',
    isFollowUp: false,
    currentState: {
      theme: 'coffee',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: [],
    },
  };
  const opts = context?.options;

  const searchLocalDakLakCatalogTool = tool(
    async (input: { query: string; lang?: Language; themeKey?: ThemeType }): Promise<LocalCatalogSearchOutput> => {
      return withOpenInferenceSpan(
        'search_local_daklak_catalog',
        {
          kind: OpenInferenceSpanKind.TOOL,
          input,
          attributes: {
            [TOOL_NAME]: 'search_local_daklak_catalog',
            [TOOL_DESCRIPTION]:
              'Queries local SQLite stays, logistics, enriched places directory, seasons, and published CMS posts.',
            [TOOL_PARAMETERS]: JSON.stringify(input),
          },
          formatOutput: (out) => ({
            staysCount: out.stays.length,
            logisticsCount: out.logistics.length,
            placesCount: out.places.length,
            seasonsCount: out.seasons.length,
            postsCount: out.relevantPosts.length,
          }),
        },
        async () => {
          const grounded = await loadGroundedQaContext({
            stays: opts?.stays,
            logistics: opts?.logistics,
          });
          const lang: Language = input.lang || defaultReq.lang || 'vi';
          const themeKey: ThemeType = input.themeKey || defaultReq.currentState.theme || 'coffee';

          let relevantPosts: CmsPostPublic[] = [];
          try {
            relevantPosts = await queryRelevantPublishedPosts({
              lang,
              themeKey,
              limit: 3,
            });
          } catch {
            relevantPosts = [];
          }

          const citations: AiCitation[] = relevantPosts.map((p) => ({
            title: p.title,
            url: `/blog/${p.slug}`,
            snippet: p.excerpt,
            source: 'cms',
          }));

          return {
            ...grounded,
            relevantPosts,
            citations,
          };
        }
      );
    },
    {
      name: 'search_local_daklak_catalog',
      description:
        'Queries local Đắk Lắk SQLite catalog for stays/accommodations & amenities, transport/logistics rates, curated attraction directory, seasonal guides, and published CMS stories.',
      schema: z.object({
        query: z.string().describe('User question or search topic for local Đắk Lắk catalog'),
        lang: z.enum(['vi', 'en']).optional().describe('UI language (vi or en)'),
        themeKey: z
          .enum(['coffee', 'culture', 'nature', 'cuisine'])
          .optional()
          .describe('Primary travel theme for relevant CMS stories'),
      }),
    }
  );

  const searchLiveWebTavilyTool = tool(
    async (input: { query: string }): Promise<TavilyQaLookupResult> => {
      return withOpenInferenceSpan(
        'search_live_web_tavily',
        {
          kind: OpenInferenceSpanKind.TOOL,
          input,
          attributes: {
            [TOOL_NAME]: 'search_live_web_tavily',
            [TOOL_DESCRIPTION]:
              'Searches live external web via Tavily for up-to-date prices, opening hours, weather, festivals, transport, or external Đắk Lắk landmarks.',
            [TOOL_PARAMETERS]: JSON.stringify(input),
          },
          formatOutput: (out) => ({
            query: out.query,
            status: out.status || 'ok',
            ...(out.error ? { error: out.error } : {}),
            hasAnswer: Boolean(out.answer),
            snippetsCount: out.snippets.length,
            citationsCount: out.citations.length,
          }),
        },
        async () => {
          if (opts?.forceSkipTavily || opts?.enableTavily === false) {
            return {
              query: input.query,
              snippets: [],
              citations: [],
              status: 'disabled',
            };
          }

          return searchGeneralQaWithTavily(input.query, {
            enableTavily: opts?.enableTavily,
            tavilyClient: opts?.tavilyClient,
          });
        }
      );
    },
    {
      name: 'search_live_web_tavily',
      description:
        'Invokes Tavily live web search for external information, real-time attraction/hotel prices, weather, events, flights/buses, or unseeded Đắk Lắk landmarks, returning grounded citations.',
      schema: z.object({
        query: z.string().describe('Live web search query for Đắk Lắk / Buôn Ma Thuột'),
      }),
    }
  );

  const updateTripIntakeTool = tool(
    async (input: {
      message?: string;
      lang?: Language;
      isFollowUp?: boolean;
    }): Promise<UpdateTripIntakeToolOutput> => {
      return withOpenInferenceSpan(
        'update_trip_intake',
        {
          kind: OpenInferenceSpanKind.TOOL,
          input,
          attributes: {
            [TOOL_NAME]: 'update_trip_intake',
            [TOOL_DESCRIPTION]:
              'Extracts and merges user trip constraints into IntakeState and builds clarification options.',
            [TOOL_PARAMETERS]: JSON.stringify(input),
          },
          formatOutput: (out) => ({
            intent: out.intake.intent,
            needsClarification: out.intake.needsClarification,
            missingFields: out.intake.missingFields,
            provider: out.provider,
          }),
        },
        async () => {
          const effectiveReq: AiChatRequest = {
            ...defaultReq,
            message: input.message ?? defaultReq.message,
            lang: input.lang ?? defaultReq.lang,
            isFollowUp: input.isFollowUp ?? defaultReq.isFollowUp,
          };

          const phase1 = await runPhase1Intake(effectiveReq, {
            enableTavily: opts?.forceSkipTavily ? false : opts?.enableTavily,
            tavilyClient: opts?.tavilyClient,
          });
          const clarificationOptions = phase1.intake.needsClarification
            ? buildClarificationOptions(effectiveReq.lang, phase1.intake.missingFields)
            : [];

          return {
            intake: phase1.intake,
            stopOperations: phase1.stopOperations,
            clarificationOptions,
            generalQaReply: phase1.generalQaReply,
            citations: phase1.citations,
            tavilySnippets: phase1.tavilySnippets,
            tavilyAnswer: phase1.tavilyAnswer,
            provider: phase1.provider,
          };
        }
      );
    },
    {
      name: 'update_trip_intake',
      description:
        'Extracts and merges traveler count, companion type, dates/duration, budget tier/amount, and purpose into IntakeState with non-blocking Q&A support.',
      schema: z.object({
        message: z.string().optional().describe('User message to extract trip slots from'),
        lang: z.enum(['vi', 'en']).optional().describe('UI language'),
        isFollowUp: z.boolean().optional().describe('Whether this is a follow-up turn'),
      }),
    }
  );

  const planOrModifyItineraryTool = tool(
    async (input: {
      mode?: 'full_plan' | 'follow_up' | 'modify_stops';
      message?: string;
    }): Promise<LangGraphPlannerResults> => {
      return withOpenInferenceSpan(
        'plan_or_modify_itinerary',
        {
          kind: OpenInferenceSpanKind.TOOL,
          input,
          attributes: {
            [TOOL_NAME]: 'plan_or_modify_itinerary',
            [TOOL_DESCRIPTION]:
              'Executes Phases 2-5 itinerary synthesis or targeted follow-up mutations via followUpRouter.',
            [TOOL_PARAMETERS]: JSON.stringify(input),
          },
          formatOutput: (out) => ({
            mode: out.mode,
            followUpAction: out.followUpAction,
            handled: out.handled,
            daysCount: out.response?.generatedDays?.length || 0,
          }),
        },
        async () => {
          const effectiveReq: AiChatRequest = {
            ...defaultReq,
            message: input.message ?? defaultReq.message,
          };

          const requestedMode = input.mode || 'full_plan';

          if (requestedMode === 'follow_up') {
            const followUpResult = await routeFollowUp(effectiveReq, {
              fetchFn: opts?.fetchFn,
              stays: opts?.stays,
              logistics: opts?.logistics,
            });
            if (followUpResult.handled && followUpResult.response) {
              return {
                mode: 'follow_up',
                followUpAction: followUpResult.followUpAction,
                handled: true,
                response: followUpResult.response,
              };
            }
          }

          const effectiveIntake: IntakeState =
            context?.intake || runPhase1IntakeDeterministic(effectiveReq).intake;

          const resolvedPreferences: AiChatResponse['preferences'] = {
            theme: sanitizeTheme(effectiveIntake.mainPurpose, effectiveReq.currentState.theme),
            duration: sanitizeDuration(effectiveIntake.duration, effectiveReq.currentState.duration),
            companion: sanitizeCompanion(
              effectiveIntake.companionType,
              effectiveReq.currentState.companion
            ),
            budget: sanitizeBudget(effectiveIntake.budgetTier, effectiveReq.currentState.budget),
          };

          if (requestedMode === 'modify_stops' || effectiveIntake.intent === 'modify_stops') {
            const hasGemini = Boolean(GEMINI_API_KEY.trim());
            const modRes = buildModifyStopsReply(
              effectiveReq,
              [],
              resolvedPreferences,
              hasGemini ? `gemini-ai:${GEMINI_MODEL.trim() || 'gemini-2.5-flash'}` : 'local-fallback'
            );
            return {
              mode: 'modify_stops',
              followUpAction: 'modify_stops',
              handled: true,
              response: modRes,
            };
          }

          const capacityPlan = await runPhase2Capacity(effectiveIntake, {
            stays: opts?.stays,
            logistics: opts?.logistics,
            lang: effectiveReq.lang,
          });
          const budgetResult = await runPhase3Budget(effectiveIntake, capacityPlan, {
            forceSkipTavily: opts?.forceSkipTavily,
            skipSqliteUpsert: opts?.skipSqliteUpsert,
            tavilyLookupFn: opts?.tavilyLookupFn,
            lang: effectiveReq.lang,
          });
          const purposeSelection = await runPhase4Purpose(
            effectiveIntake,
            capacityPlan,
            budgetResult,
            {
              lang: effectiveReq.lang,
              fetchFn: opts?.fetchFn,
            }
          );

          const hasGemini = Boolean(GEMINI_API_KEY.trim());
          const synthesized = hasGemini
            ? await runPhase5Synthesis(
                effectiveReq,
                effectiveIntake,
                capacityPlan,
                budgetResult,
                purposeSelection
              )
            : synthesizeDeterministicPlan(
                effectiveReq,
                effectiveIntake,
                capacityPlan,
                budgetResult,
                purposeSelection,
                'local-fallback'
              );

          return {
            mode: 'full_plan',
            handled: true,
            capacityPlan,
            budgetResult,
            purposeSelection,
            response: synthesized,
          };
        }
      );
    },
    {
      name: 'plan_or_modify_itinerary',
      description:
        'Executes full 5-phase Đắk Lắk itinerary synthesis (capacity, budget feasibility, purpose selection, schedule & expense synthesis) or targeted follow-up itinerary edits.',
      schema: z.object({
        mode: z
          .enum(['full_plan', 'follow_up', 'modify_stops'])
          .optional()
          .describe('Execution mode: full_plan, follow_up, or modify_stops'),
        message: z.string().optional().describe('User request message'),
      }),
    }
  );

  return {
    search_local_daklak_catalog: searchLocalDakLakCatalogTool,
    search_live_web_tavily: searchLiveWebTavilyTool,
    update_trip_intake: updateTripIntakeTool,
    plan_or_modify_itinerary: planOrModifyItineraryTool,
    all: [
      searchLocalDakLakCatalogTool,
      searchLiveWebTavilyTool,
      updateTripIntakeTool,
      planOrModifyItineraryTool,
    ],
  };
}

// ============================================================================
// Compiled Cyclic LangGraph StateGraph Nodes & Edges
// ============================================================================

export function buildDakLakLangGraph(options?: LangGraphRunOptions) {
  const supervisorRouterNode = async (
    state: DakLakGraphState
  ): Promise<Partial<DakLakGraphState>> => {
    const visited = [...(state.graphNodesVisited || []), 'supervisor_router'];
    const baseReq = state.req;
    const checkpointDraftIntake =
      !baseReq.draftIntake && state.intake?.needsClarification ? state.intake : baseReq.draftIntake;
    const req: AiChatRequest = checkpointDraftIntake
      ? { ...baseReq, draftIntake: checkpointDraftIntake }
      : baseReq;

    const plannedTools: LangGraphToolName[] = [];
    let followUpAction: FollowUpActionType | undefined;
    let intent: AgenticIntent = 'general_qa';

    const isActiveFollowUp =
      req.isFollowUp &&
      req.currentState.days.length > 0 &&
      !req.draftIntake?.needsClarification;

    // 1. Optional Gemini supervisor tool-calling inspection when GEMINI_API_KEY is configured
    const apiKey = GEMINI_API_KEY.trim();
    const modelName = GEMINI_MODEL.trim() || 'gemini-2.5-flash';
    let aiSupervisorMessage: AIMessage | null = null;

    if (apiKey) {
      try {
        const tools = createDakLakLangGraphTools({ req, options }).all;
        const llm = new ChatGoogleGenerativeAI({
          apiKey,
          model: modelName,
          temperature: 0.1,
          maxOutputTokens: 256,
        }).bindTools(tools);

        const sysMsg = new SystemMessage(
          [
            'You are the LangGraph Supervisor Router for Đắk Lắk AI Travel Concierge.',
            'Select the appropriate tools to handle the user message:',
            '- For general questions, stay/amenity inquiries, transport/price/weather/festival/external landmark questions: call `search_local_daklak_catalog` and `search_live_web_tavily`.',
            '- For new trip planning or slot clarification replies: call `update_trip_intake` (and `plan_or_modify_itinerary` when slots are complete).',
            '- For follow-up edits on an active itinerary: call `plan_or_modify_itinerary`.',
          ].join('\n')
        );

        aiSupervisorMessage = await withOpenInferenceSpan(
          'langgraph_supervisor_llm',
          {
            kind: OpenInferenceSpanKind.LLM,
            input: req.message,
            attributes: {
              [LLM_MODEL_NAME]: modelName,
              [LLM_PROVIDER]: 'google',
              [LLM_SYSTEM]: 'gemini',
            },
            formatOutput: (msg) => ({
              content: typeof msg.content === 'string' ? msg.content : '',
              toolCalls: (msg.tool_calls || []).map((tc) => tc.name),
            }),
          },
          async () => {
            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 3500)
            );
            const res = await Promise.race([
              llm.invoke([sysMsg, new HumanMessage(req.message)]),
              timeoutPromise,
            ]);
            return res ? (res as AIMessage) : new AIMessage('');
          }
        );
      } catch {
        aiSupervisorMessage = null;
      }
    }

    // 2. Deterministic & Guardrailed Routing Logic
    if (isActiveFollowUp) {
      const classified = await classifyFollowUpAction(req, {
        fetchFn: options?.fetchFn,
        stays: options?.stays,
        logistics: options?.logistics,
      });
      followUpAction = classified.action;

      if (followUpAction === 'current_trip_qa') {
        intent = 'general_qa';
        plannedTools.push('search_local_daklak_catalog', 'search_live_web_tavily');
      } else if (followUpAction === 'full_replan') {
        intent = 'plan_trip';
        plannedTools.push('update_trip_intake', 'plan_or_modify_itinerary');
      } else {
        intent = followUpAction === 'modify_stops' ? 'modify_stops' : 'plan_trip';
        plannedTools.push('plan_or_modify_itinerary');
      }
    } else {
      const detPhase1 = runPhase1IntakeDeterministic(req);
      intent = detPhase1.intake.intent;

      if (intent === 'general_qa') {
        plannedTools.push('update_trip_intake', 'search_local_daklak_catalog', 'search_live_web_tavily');
      } else if (intent === 'modify_stops') {
        plannedTools.push('update_trip_intake', 'plan_or_modify_itinerary');
      } else {
        plannedTools.push('update_trip_intake');
        if (!detPhase1.intake.needsClarification) {
          plannedTools.push('plan_or_modify_itinerary');
        }
      }
    }

    // Merge any additional valid tool calls suggested by Gemini supervisor without violating QA guardrails
    if (aiSupervisorMessage?.tool_calls && aiSupervisorMessage.tool_calls.length > 0) {
      for (const tc of aiSupervisorMessage.tool_calls) {
        const toolName = tc.name as LangGraphToolName;
        if (
          LANGGRAPH_TOOL_NAMES.includes(toolName) &&
          !plannedTools.includes(toolName)
        ) {
          if (intent === 'general_qa' && toolName === 'plan_or_modify_itinerary') {
            continue;
          }
          plannedTools.push(toolName);
        }
      }
    }

    const newMessages: BaseMessage[] = [new HumanMessage(req.message)];
    if (aiSupervisorMessage) {
      newMessages.push(aiSupervisorMessage);
    }

    return {
      req,
      intent,
      followUpAction,
      plannedTools,
      graphNodesVisited: visited,
      messages: newMessages,
    };
  };

  const toolExecutionNode = async (
    state: DakLakGraphState
  ): Promise<Partial<DakLakGraphState>> => {
    const visited = [...(state.graphNodesVisited || []), 'tool_execution_node'];
    const req = state.req;
    let currentIntake = state.intake;
    let phase1Output = state.phase1Output;
    let clarificationOptions = state.clarificationOptions;
    let localContext = state.localContext;
    let tavilyContext = state.tavilyContext;
    let plannerResults = state.plannerResults;
    let intent = state.intent;
    let followUpAction = state.followUpAction;

    const toolsUsed: string[] = [...(state.toolsUsed || [])];
    const toolMessages: BaseMessage[] = [];
    const planned = [...(state.plannedTools || [])];

    const recordToolUse = (name: LangGraphToolName, summaryObj: unknown) => {
      if (!toolsUsed.includes(name)) {
        toolsUsed.push(name);
      }
      toolMessages.push(
        new ToolMessage({
          tool_call_id: `call_${name}_${toolsUsed.length}`,
          name,
          content: JSON.stringify(summaryObj),
        })
      );
    };

    // Execute `update_trip_intake` first if scheduled
    if (planned.includes('update_trip_intake')) {
      const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
      const intakeOut = await toolset.update_trip_intake.invoke({
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
      });
      currentIntake = intakeOut.intake;
      phase1Output = {
        intake: intakeOut.intake,
        stopOperations: intakeOut.stopOperations,
        generalQaReply: intakeOut.generalQaReply,
        citations: intakeOut.citations,
        tavilySnippets: intakeOut.tavilySnippets,
        tavilyAnswer: intakeOut.tavilyAnswer,
        provider: intakeOut.provider,
      };
      clarificationOptions = intakeOut.clarificationOptions;
      intent = intakeOut.intake.intent;
      recordToolUse('update_trip_intake', {
        intent: currentIntake.intent,
        needsClarification: currentIntake.needsClarification,
        missingFields: currentIntake.missingFields,
      });

      // Dynamically adjust downstream tools if Gemini Phase 1 updated intent or clarification status
      if (intent === 'general_qa') {
        if (!planned.includes('search_local_daklak_catalog')) {
          planned.push('search_local_daklak_catalog');
        }
        if (!planned.includes('search_live_web_tavily')) {
          planned.push('search_live_web_tavily');
        }
      } else if (intent === 'plan_trip' && !currentIntake.needsClarification) {
        if (!planned.includes('plan_or_modify_itinerary')) {
          planned.push('plan_or_modify_itinerary');
        }
      } else if (intent === 'modify_stops' && !planned.includes('plan_or_modify_itinerary')) {
        planned.push('plan_or_modify_itinerary');
      }
    }

    // Execute `search_local_daklak_catalog` if scheduled
    if (planned.includes('search_local_daklak_catalog')) {
      const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
      const themeKey = sanitizeTheme(
        currentIntake?.mainPurpose || req.currentState.theme,
        req.currentState.theme
      );
      localContext = await toolset.search_local_daklak_catalog.invoke({
        query: req.message,
        lang: req.lang,
        themeKey,
      });
      recordToolUse('search_local_daklak_catalog', {
        staysCount: localContext.stays.length,
        placesCount: localContext.places.length,
        postsCount: localContext.relevantPosts.length,
      });
    }

    // Execute `search_live_web_tavily` if scheduled
    if (planned.includes('search_live_web_tavily')) {
      if (
        phase1Output &&
        ((phase1Output.tavilySnippets && phase1Output.tavilySnippets.length > 0) ||
          phase1Output.tavilyAnswer)
      ) {
        tavilyContext = {
          query: req.message,
          ...(phase1Output.tavilyAnswer ? { answer: phase1Output.tavilyAnswer } : {}),
          snippets: phase1Output.tavilySnippets || [],
          citations: phase1Output.citations || [],
        };
      } else {
        const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
        tavilyContext = await toolset.search_live_web_tavily.invoke({
          query: req.message,
        });
      }
      recordToolUse('search_live_web_tavily', {
        status: tavilyContext.status || 'ok',
        ...(tavilyContext.error ? { error: tavilyContext.error } : {}),
        hasAnswer: Boolean(tavilyContext.answer),
        snippetsCount: tavilyContext.snippets.length,
        citationsCount: tavilyContext.citations.length,
      });
    }

    // Execute `plan_or_modify_itinerary` if scheduled and not blocked by clarification or general_qa
    const shouldRunPlanner =
      planned.includes('plan_or_modify_itinerary') &&
      intent !== 'general_qa' &&
      !(intent === 'plan_trip' && currentIntake?.needsClarification);

    if (shouldRunPlanner) {
      const isFollowUpEdit =
        req.isFollowUp &&
        req.currentState.days.length > 0 &&
        !req.draftIntake?.needsClarification &&
        followUpAction !== undefined &&
        followUpAction !== 'full_replan' &&
        followUpAction !== 'current_trip_qa';

      const mode: 'full_plan' | 'follow_up' | 'modify_stops' = isFollowUpEdit
        ? 'follow_up'
        : intent === 'modify_stops'
          ? 'modify_stops'
          : 'full_plan';

      if (mode === 'modify_stops' && phase1Output && phase1Output.stopOperations.length > 0) {
        const resolvedPreferences: AiChatResponse['preferences'] = {
          theme: sanitizeTheme(currentIntake?.mainPurpose, req.currentState.theme),
          duration: sanitizeDuration(currentIntake?.duration, req.currentState.duration),
          companion: sanitizeCompanion(currentIntake?.companionType, req.currentState.companion),
          budget: sanitizeBudget(currentIntake?.budgetTier, req.currentState.budget),
        };
        const hasGemini = Boolean(GEMINI_API_KEY.trim());
        plannerResults = {
          mode: 'modify_stops',
          followUpAction: 'modify_stops',
          handled: true,
          response: buildModifyStopsReply(
            req,
            phase1Output.stopOperations,
            resolvedPreferences,
            hasGemini ? phase1Output.provider : 'local-fallback'
          ),
        };
      } else {
        const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
        plannerResults = await toolset.plan_or_modify_itinerary.invoke({
          mode,
          message: req.message,
        });
      }

      if (plannerResults.followUpAction) {
        followUpAction = plannerResults.followUpAction;
      }

      recordToolUse('plan_or_modify_itinerary', {
        mode: plannerResults.mode,
        followUpAction: plannerResults.followUpAction,
        daysCount: plannerResults.response?.generatedDays?.length || 0,
      });
    }

    return {
      intent,
      followUpAction,
      intake: currentIntake,
      phase1Output,
      clarificationOptions,
      localContext,
      tavilyContext,
      plannerResults,
      toolsUsed,
      graphNodesVisited: visited,
      messages: toolMessages,
    };
  };

  const synthesisNode = async (
    state: DakLakGraphState
  ): Promise<Partial<DakLakGraphState>> => {
    const visited = [...(state.graphNodesVisited || []), 'synthesis_node'];
    const req = state.req;
    const intake = state.intake;
    const phase1Output = state.phase1Output;
    const localContext = state.localContext;
    const tavilyContext = state.tavilyContext;
    let plannerResults = state.plannerResults;
    const hasGemini = Boolean(getGeminiApiKey() || GEMINI_API_KEY.trim());
    const model = GEMINI_MODEL.trim() || 'gemini-2.5-flash';

    const resolvedPreferences: AiChatResponse['preferences'] = {
      theme: sanitizeTheme(intake?.mainPurpose, req.currentState.theme),
      duration: sanitizeDuration(intake?.duration, req.currentState.duration),
      companion: sanitizeCompanion(intake?.companionType, req.currentState.companion),
      budget: sanitizeBudget(intake?.budgetTier, req.currentState.budget),
    };

    let response: AiChatResponse;

    // If this is a retry from evaluator_guardrail_node for Phase 5 output
    if (
      state.evalAttempts > 0 &&
      state.retryFeedback.length > 0 &&
      plannerResults?.mode === 'full_plan' &&
      plannerResults.capacityPlan &&
      plannerResults.budgetResult &&
      plannerResults.purposeSelection &&
      intake &&
      hasGemini
    ) {
      const retriedResponse = await runPhase5Synthesis(
        req,
        intake,
        plannerResults.capacityPlan,
        plannerResults.budgetResult,
        plannerResults.purposeSelection,
        state.retryFeedback
      );
      plannerResults = {
        ...plannerResults,
        response: retriedResponse,
      };
      response = retriedResponse;
    } else if (plannerResults?.handled && plannerResults.response) {
      // Follow-up edit or Phase 5 synthesized plan
      response = {
        ...plannerResults.response,
        ...(state.followUpAction ? { followUpAction: state.followUpAction } : {}),
      };
    } else if (state.intent === 'general_qa') {
      // Grounded General Q&A or Current Trip Q&A synthesis
      const effectiveLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const effectiveSnippets = tavilyContext?.snippets || phase1Output?.tavilySnippets || [];
      const effectiveAnswer = tavilyContext?.answer || phase1Output?.tavilyAnswer;
      const effectiveTavilyCitations = tavilyContext?.citations || phase1Output?.citations || [];
      const cmsCitations = localContext?.citations || [];

      const deterministicReply = await buildGroundedQaReplyDeterministic(req, {
        stays: options?.stays,
        logistics: options?.logistics,
        tavilySnippets: effectiveSnippets,
        ...(effectiveAnswer ? { tavilyAnswer: effectiveAnswer } : {}),
      });

      const needsGeminiQaSynthesis =
        hasGemini &&
        (!phase1Output?.generalQaReply ||
          hasElephantRidingViolation(phase1Output.generalQaReply) ||
          ((phase1Output.citations || []).length === 0 &&
            (Boolean(effectiveAnswer) || effectiveSnippets.length > 0)) ||
          (effectiveLang === 'vi' && isLikelyEnglishText(phase1Output.generalQaReply)));

      let rawReply =
        hasGemini &&
        phase1Output?.generalQaReply &&
        !hasElephantRidingViolation(phase1Output.generalQaReply)
          ? phase1Output.generalQaReply
          : deterministicReply;
      let provider =
        hasGemini && phase1Output?.generalQaReply ? phase1Output.provider : 'local-fallback';

      if (needsGeminiQaSynthesis) {
        const apiKey = getGeminiApiKey() || GEMINI_API_KEY.trim();
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const sysPrompt = [
          'You are the Đắk Lắk AI Travel Concierge Q&A Synthesizer.',
          `Target reply language: "${effectiveLang}".`,
          `CRITICAL LANGUAGE RULE: Write 100% of your reply in ${effectiveLang === 'vi' ? 'natural, fluent Vietnamese' : 'natural, fluent English'}. Even if the Tavily web summary or snippets are in English, translate and synthesize every fact into natural ${effectiveLang === 'vi' ? 'Vietnamese' : 'English'} — NEVER output English sentences when target language is "vi".`,
          'FORMATTING RULE: Format your answer for clear readability using clean Markdown:',
          '- Start with a 1–2 sentence direct answer to the user’s question.',
          '- Use concise bullet points ("- **Label**: detail") for schedules, prices, highlights, or practical tips, with blank lines between sections.',
          '- Never suggest elephant riding; promote ethical elephant observation instead.',
        ].join('\n');
        const qaPrompt = [
          `userQuestion: ${req.message}`,
          phase1Output?.generalQaReply ? `draftReply:\n${phase1Output.generalQaReply}` : '',
          localContext
            ? `localCatalogSummary:\n${JSON.stringify({
                stays: localContext.stays.slice(0, 6).map((s) => ({
                  name: s.name,
                  area: s.area,
                  tier: s.tier,
                  nightlyRateVnd: s.nightlyRateVnd,
                  amenities: s.amenities,
                })),
                places: localContext.places.slice(0, 8).map((p) => ({
                  title: p.title,
                  location: p.location,
                  ticketVnd: p.ticketVnd,
                  desc: p.desc,
                })),
              })}`
            : '',
          effectiveAnswer ? `tavilyLiveWebAnswer:\n${effectiveAnswer}` : '',
          effectiveSnippets.length > 0
            ? `tavilyLiveWebSnippets:\n${JSON.stringify(effectiveSnippets)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);
        try {
          const fetchFn = options?.fetchFn || fetch;
          const synthOut = await withOpenInferenceSpan(
            'gemini_langgraph_qa_synthesis',
            {
              kind: OpenInferenceSpanKind.LLM,
              input: qaPrompt,
              attributes: {
                [LLM_MODEL_NAME]: model,
                [LLM_PROVIDER]: 'google',
                [LLM_SYSTEM]: 'gemini',
              },
              formatOutput: (text) => text,
            },
            async () => {
              const resp = await fetchFn(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: sysPrompt }] },
                  contents: [{ role: 'user', parts: [{ text: qaPrompt }] }],
                  generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1200,
                  },
                }),
              });
              if (!resp.ok) {
                throw new Error(`Gemini Q&A synthesis HTTP ${resp.status}`);
              }
              const data = (await resp.json()) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
              };
              return (data.candidates?.[0]?.content?.parts || [])
                .filter((p) => !p.thought && typeof p.text === 'string')
                .map((p) => p.text)
                .join('')
                .trim();
            }
          );
          if (
            synthOut &&
            !hasElephantRidingViolation(synthOut) &&
            !(effectiveLang === 'vi' && isLikelyEnglishText(synthOut))
          ) {
            rawReply = synthOut;
            provider = `gemini-ai:${model}`;
          }
        } catch {
          // Keep deterministicReply or phase1Output.generalQaReply on error
        } finally {
          clearTimeout(timer);
        }
      }

      if (effectiveLang === 'vi' && isLikelyEnglishText(rawReply)) {
        rawReply = deterministicReply;
      }

      const citations = dedupeCitations([...effectiveTavilyCitations, ...cmsCitations]);

      response = {
        intent: 'general_qa',
        ...(state.followUpAction ? { followUpAction: state.followUpAction } : {}),
        reply: rawReply,
        shouldOpenPlanner: false,
        preferences: resolvedPreferences,
        resetItineraryToTheme: false,
        stopOperations: [],
        provider,
        status: 'completed',
        citations,
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
    } else if (intake?.needsClarification) {
      // Targeted slot clarification response
      response = {
        intent: 'update_itinerary',
        reply:
          intake.clarificationQuestion ||
          (req.lang === 'en'
            ? 'Please share your traveler count, travel dates, and budget tier so I can build an accurate Đắk Lắk plan.'
            : 'Bạn cho mình biết thêm số lượng người đi, thời gian dự kiến và mức ngân sách để mình lên lịch trình Đắk Lắk chính xác nhé!'),
        shouldOpenPlanner: false,
        preferences: resolvedPreferences,
        resetItineraryToTheme: false,
        stopOperations: [],
        provider: hasGemini && phase1Output ? phase1Output.provider : 'local-fallback',
        status: 'needs_clarification',
        suggestedPresets: sampleSchedulePresets,
        draftIntake: intake,
        clarificationOptions:
          state.clarificationOptions || buildClarificationOptions(req.lang, intake.missingFields),
      };
    } else {
      // Fallback modify_stops
      response = buildModifyStopsReply(
        req,
        phase1Output?.stopOperations || [],
        resolvedPreferences,
        hasGemini && phase1Output ? phase1Output.provider : 'local-fallback'
      );
    }

    const enrichedResponse: AiChatResponse = {
      ...response,
      traceId: state.traceId || response.traceId,
      engine: 'langgraph',
      toolsUsed: state.toolsUsed,
      graphNodesVisited: [...visited, 'evaluator_guardrail_node'],
    };

    return {
      plannerResults,
      response: enrichedResponse,
      graphNodesVisited: visited,
      messages: [new AIMessage(enrichedResponse.reply)],
    };
  };

  const evaluatorGuardrailNode = async (
    state: DakLakGraphState
  ): Promise<Partial<DakLakGraphState>> => {
    const visited = [...(state.graphNodesVisited || []), 'evaluator_guardrail_node'];
    const attempts = (state.evalAttempts || 0) + 1;
    const currentResponse = state.response;

    if (!currentResponse) {
      return {
        graphNodesVisited: visited,
        evalAttempts: attempts,
        needsEvalRetry: false,
      };
    }

    const plannerResults = state.plannerResults;
    const intake = state.intake;

    // Case 1: Full 5-Phase Itinerary Output Evaluation
    if (
      plannerResults?.mode === 'full_plan' &&
      plannerResults.capacityPlan &&
      plannerResults.budgetResult &&
      plannerResults.purposeSelection &&
      intake
    ) {
      const spanName =
        attempts > 1 ? 'phase5_runtime_evaluator_retry' : 'phase5_runtime_evaluator';
      const evalName =
        attempts > 1 ? 'phase5_hard_constraints_retry' : 'phase5_hard_constraints';

      const evalCheck = await withOpenInferenceSpan(
        spanName,
        {
          kind: OpenInferenceSpanKind.EVALUATOR,
          input: {
            attempt: attempts,
            daysCount: currentResponse.generatedDays?.length || 0,
            expensesCount: currentResponse.generatedExpenses?.length || 0,
            totalBudgetVnd: plannerResults.budgetResult.totalBudgetVnd,
          },
          formatOutput: (res) => res.evalResult,
          onSuccess: (span, res) => {
            span.setAttribute(EVALUATION_NAME, evalName);
            span.setAttribute(EVALUATION_ANNOTATOR_KIND, 'CODE');
            span.setAttribute(EVALUATION_SCORE, res.evalResult.score);
            span.setAttribute(EVALUATION_LABEL, res.evalResult.passed ? 'pass' : 'fail');
            span.setAttribute(
              EVALUATION_EXPLANATION,
              res.evalResult.violations.join('; ') || 'All deterministic checks passed.'
            );
          },
        },
        () =>
          evaluatePhase5Output({
            response: currentResponse,
            intake,
            capacityPlan: plannerResults.capacityPlan!,
            budgetResult: plannerResults.budgetResult!,
            purposeSelection: plannerResults.purposeSelection!,
          })
      );

      const hasGemini = Boolean(GEMINI_API_KEY.trim());
      const shouldRetry =
        !evalCheck.evalResult.passed && evalCheck.needsRetry && attempts < 2 && hasGemini;

      const repaired: AiChatResponse = {
        ...evalCheck.repairedResponse,
        intent: sanitizeIntent(evalCheck.repairedResponse.intent, 'update_itinerary'),
        traceId: state.traceId || currentResponse.traceId,
        status: currentResponse.status || 'completed',
        ...(state.followUpAction ? { followUpAction: state.followUpAction } : {}),
        engine: 'langgraph',
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited,
      };

      return {
        response: repaired,
        evalResult: evalCheck.evalResult,
        evalAttempts: attempts,
        needsEvalRetry: shouldRetry,
        retryFeedback: evalCheck.evalResult.violations,
        graphNodesVisited: visited,
      };
    }

    // Case 2: General Q&A and Current Trip Q&A Output Evaluation
    if (currentResponse.intent === 'general_qa') {
      const validPostSlugs = (state.localContext?.relevantPosts || []).map((p) => p.slug);
      const qaEval = await withOpenInferenceSpan(
        'qa_runtime_evaluator',
        {
          kind: OpenInferenceSpanKind.EVALUATOR,
          input: {
            userMessage: state.req.message,
            replyLength: currentResponse.reply.length,
            citationsCount: currentResponse.citations?.length || 0,
          },
          formatOutput: (res) => res.evalResult,
          onSuccess: (span, res) => {
            span.setAttribute(EVALUATION_NAME, 'qa_grounding_and_ethics');
            span.setAttribute(EVALUATION_ANNOTATOR_KIND, 'CODE');
            span.setAttribute(EVALUATION_SCORE, res.evalResult.score);
            span.setAttribute(EVALUATION_LABEL, res.evalResult.passed ? 'pass' : 'fail');
            span.setAttribute(
              EVALUATION_EXPLANATION,
              res.evalResult.violations.join('; ') || 'All Q&A checks passed.'
            );
          },
        },
        () =>
          evaluateQaOutput({
            response: currentResponse,
            userMessage: state.req.message,
            tavilySnippets: state.tavilyContext?.snippets,
            tavilyCitations: state.tavilyContext?.citations,
            validPostSlugs,
          })
      );

      const repaired: AiChatResponse = {
        ...qaEval.repairedResponse,
        traceId: state.traceId || currentResponse.traceId,
        engine: 'langgraph',
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited,
      };

      return {
        response: repaired,
        evalResult: qaEval.evalResult,
        evalAttempts: attempts,
        needsEvalRetry: false,
        graphNodesVisited: visited,
      };
    }

    // Case 3: Clarification or Micro-Router Follow-Up Mutations (ethical elephant text check)
    let safeReply = currentResponse.reply;
    if (hasElephantRidingViolation(safeReply)) {
      const qaEval = evaluateQaOutput({
        response: currentResponse,
        userMessage: state.req.message,
      });
      safeReply = qaEval.repairedResponse.reply;
    }

    return {
      response: {
        ...currentResponse,
        reply: safeReply,
        traceId: state.traceId || currentResponse.traceId,
        engine: 'langgraph',
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited,
      },
      evalAttempts: attempts,
      needsEvalRetry: false,
      graphNodesVisited: visited,
    };
  };

  const shouldRetryOrFinish = (state: DakLakGraphState): 'synthesis_node' | typeof END => {
    if (state.needsEvalRetry && state.evalAttempts < 2) {
      return 'synthesis_node';
    }
    return END;
  };

  const workflow = new StateGraph(DakLakGraphStateAnnotation)
    .addNode('supervisor_router', supervisorRouterNode)
    .addNode('tool_execution_node', toolExecutionNode)
    .addNode('synthesis_node', synthesisNode)
    .addNode('evaluator_guardrail_node', evaluatorGuardrailNode)
    .addEdge(START, 'supervisor_router')
    .addEdge('supervisor_router', 'tool_execution_node')
    .addEdge('tool_execution_node', 'synthesis_node')
    .addEdge('synthesis_node', 'evaluator_guardrail_node')
    .addConditionalEdges('evaluator_guardrail_node', shouldRetryOrFinish, {
      synthesis_node: 'synthesis_node',
      [END]: END,
    });

  return workflow.compile({ checkpointer: sharedCheckpointer });
}

/**
 * Executes a conversational turn through the compiled Đắk Lắk LangGraph `StateGraph`
 * with `MemorySaver` thread checkpointing (`thread_id = sessionId`).
 */
export async function runLangGraphChat(
  req: AiChatRequest,
  opts?: LangGraphRunOptions
): Promise<AiChatResponse> {
  const traceId = opts?.traceId || crypto.randomUUID();
  const sessionId =
    opts?.sessionId ||
    req.sessionId ||
    `sess_${crypto.createHash('sha1').update(`${req.lang}:${req.message}`).digest('hex').slice(0, 16)}`;

  return withOpenInferenceSpan(
    'daklak_langgraph_agent',
    {
      kind: OpenInferenceSpanKind.AGENT,
      input: {
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
        sessionId,
        traceId,
      },
      attributes: {
        'daklak.engine': 'langgraph',
        'daklak.session_id': sessionId,
        'daklak.trace_id': traceId,
      },
      formatOutput: (res) => ({
        intent: res.intent,
        status: res.status,
        followUpAction: res.followUpAction,
        toolsUsed: res.toolsUsed,
        graphNodesVisited: res.graphNodesVisited,
      }),
      onSuccess: (span, res) => {
        span.setAttribute('daklak.intent', res.intent);
        span.setAttribute('daklak.provider', res.provider);
        if (res.toolsUsed) {
          span.setAttribute('daklak.tools_used', JSON.stringify(res.toolsUsed));
        }
        if (res.graphNodesVisited) {
          span.setAttribute('daklak.graph_nodes_visited', JSON.stringify(res.graphNodesVisited));
        }
      },
    },
    async () => {
      const app = buildDakLakLangGraph(opts);
      const finalState = await app.invoke(
        {
          req,
          sessionId,
          traceId,
          plannedTools: [],
          clarificationOptions: undefined,
          localContext: undefined,
          tavilyContext: undefined,
          plannerResults: undefined,
          response: undefined,
          toolsUsed: [],
          graphNodesVisited: [],
          evalAttempts: 0,
          evalResult: undefined,
          needsEvalRetry: false,
          retryFeedback: [],
        },
        {
          configurable: {
            thread_id: sessionId,
          },
        }
      );

      const response = finalState.response;
      if (!response) {
        throw new Error('LangGraph execution completed without producing a response');
      }

      const finalResponse: AiChatResponse = {
        ...response,
        traceId,
        engine: 'langgraph',
        toolsUsed: finalState.toolsUsed || [],
        graphNodesVisited: finalState.graphNodesVisited || [],
      };

      traceMetadataStore.set(traceId, {
        traceId,
        sessionId,
        intake: finalState.intake,
        capacityPlan: finalState.plannerResults?.capacityPlan,
        budgetResult: finalState.plannerResults?.budgetResult,
        purposeSelection: finalState.plannerResults?.purposeSelection,
        evalResult: finalState.evalResult,
        toolsUsed: finalState.toolsUsed || [],
        graphNodesVisited: finalState.graphNodesVisited || [],
        retryCount: Math.max(0, (finalState.evalAttempts || 1) - 1),
      });

      return finalResponse;
    }
  );
}
