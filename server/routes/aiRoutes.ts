import { Router } from 'express';
import {
  AI_CHAT_MAX_MESSAGE_LENGTH,
  AI_CHAT_RATE_LIMIT_MAX,
  AI_CHAT_RATE_LIMIT_WINDOW_MS,
  GEMINI_DECISION_MODEL,
  GEMINI_MODEL,
  getGeminiApiKey,
  getTavilyApiKey,
  TAVILY_COUNTRY,
  TAVILY_INCLUDE_ANSWER,
  TAVILY_MAX_RESULTS,
  TAVILY_SEARCH_DEPTH,
  TAVILY_TIMEOUT_MS,
} from '../config.ts';
import { handleAiChat } from '../services/aiChatbot.ts';
import { listAiTraces, submitAiTraceFeedback } from '../services/aiTraceService.ts';
import { LANGGRAPH_TOOL_NAMES } from '../services/aiWorkflow/langGraphAgent.ts';
import { requireAdmin, requireAuth } from '../services/auth.ts';
import { isServiceError } from '../services/errors.ts';
import {
  AgenticIntent,
  AiChatHistoryItem,
  AiChatRequest,
  AiFeedbackRequest,
  BudgetType,
  CompanionType,
  DurationType,
  ExpenseCategory,
  IntakeState,
  Language,
  ThemeType,
} from '../../src/types/index.ts';

export const aiRouter = Router();

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateEntry>();

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [key, entry] of rateBuckets.entries()) {
      if (now > entry.resetAt) {
        rateBuckets.delete(key);
      }
    }
  }
  const existing = rateBuckets.get(clientKey);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(clientKey, { count: 1, resetAt: now + AI_CHAT_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (existing.count >= AI_CHAT_RATE_LIMIT_MAX) {
    return true;
  }
  existing.count += 1;
  return false;
}

function asTheme(val: unknown): ThemeType {
  return val === 'culture' || val === 'nature' || val === 'cuisine' ? val : 'coffee';
}

function asDuration(val: unknown): DurationType {
  return val === '2N1D' || val === '4N3D+' ? val : '3N2D';
}

function asCompanion(val: unknown): CompanionType {
  return val === 'solo' || val === 'family' || val === 'friends' ? val : 'couple';
}

function asBudget(val: unknown): BudgetType {
  return val === 'budget' || val === 'luxury' ? val : 'standard';
}

function asAgenticIntent(val: unknown): AgenticIntent | undefined {
  return val === 'general_qa' || val === 'plan_trip' || val === 'modify_stops' ? val : undefined;
}

function asExpenseCategory(val: unknown): ExpenseCategory | null {
  return val === 'stay' || val === 'transit' || val === 'food' || val === 'activity' ? val : null;
}

function sanitizeDraftIntake(raw: unknown): Partial<IntakeState> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const sanitized: Partial<IntakeState> = {};

  const intent = asAgenticIntent(r.intent);
  if (intent) sanitized.intent = intent;

  if (r.travelersCount === null) {
    sanitized.travelersCount = null;
  } else if (typeof r.travelersCount === 'number' && Number.isFinite(r.travelersCount) && r.travelersCount >= 1) {
    sanitized.travelersCount = Math.min(50, Math.round(r.travelersCount));
  }

  if (r.companionType === null) {
    sanitized.companionType = null;
  } else if (
    r.companionType === 'solo' ||
    r.companionType === 'couple' ||
    r.companionType === 'family' ||
    r.companionType === 'friends'
  ) {
    sanitized.companionType = r.companionType;
  }

  if (r.travelDates === null) {
    sanitized.travelDates = null;
  } else if (typeof r.travelDates === 'string') {
    const trimmed = r.travelDates.trim().slice(0, 120);
    if (trimmed) sanitized.travelDates = trimmed;
  }

  if (r.duration === '2N1D' || r.duration === '3N2D' || r.duration === '4N3D+') {
    sanitized.duration = r.duration;
  }

  if (r.totalBudgetVnd === null) {
    sanitized.totalBudgetVnd = null;
  } else if (typeof r.totalBudgetVnd === 'number' && Number.isFinite(r.totalBudgetVnd) && r.totalBudgetVnd >= 0) {
    sanitized.totalBudgetVnd = Math.min(1_000_000_000, Math.round(r.totalBudgetVnd));
  }

  if (r.budgetTier === 'budget' || r.budgetTier === 'standard' || r.budgetTier === 'luxury') {
    sanitized.budgetTier = r.budgetTier;
  }

  if (
    r.mainPurpose === 'coffee' ||
    r.mainPurpose === 'culture' ||
    r.mainPurpose === 'nature' ||
    r.mainPurpose === 'cuisine'
  ) {
    sanitized.mainPurpose = r.mainPurpose;
  }

  if (Array.isArray(r.secondaryInterests)) {
    sanitized.secondaryInterests = r.secondaryInterests
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 8);
  }

  if (Array.isArray(r.missingFields)) {
    const validMissing = r.missingFields.filter(
      (f): f is 'budget' | 'dates' | 'travelers' =>
        f === 'budget' || f === 'dates' || f === 'travelers',
    );
    sanitized.missingFields = Array.from(new Set(validMissing)).slice(0, 3);
  }

  if (typeof r.needsClarification === 'boolean') {
    sanitized.needsClarification = r.needsClarification;
  }

  if (typeof r.clarificationQuestion === 'string') {
    const q = r.clarificationQuestion.trim().slice(0, 400);
    if (q) sanitized.clarificationQuestion = q;
  }

  if (typeof r.rawUserGoal === 'string') {
    const goal = r.rawUserGoal.trim().slice(0, 500);
    if (goal) sanitized.rawUserGoal = goal;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeCurrentExpenses(raw: unknown): AiChatRequest['currentExpenses'] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const items: NonNullable<AiChatRequest['currentExpenses']> = [];
  for (const entry of raw.slice(0, 12)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '';
    const cat = asExpenseCategory(item.cat);
    const amount =
      typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount >= 0
        ? Math.min(1_000_000_000, Math.round(item.amount))
        : null;
    if (!title || !cat || amount === null) continue;
    items.push({ title, cat, amount });
  }
  return items.length > 0 ? items : undefined;
}

aiRouter.get('/status', (_req, res) => {
  res.json({
    configured: Boolean(getGeminiApiKey()),
    model: GEMINI_MODEL,
    decisionModel: GEMINI_DECISION_MODEL || undefined,
    tavilyConfigured: Boolean(getTavilyApiKey()),
    tavilySettings: {
      timeoutMs: TAVILY_TIMEOUT_MS,
      searchDepth: TAVILY_SEARCH_DEPTH,
      includeAnswer: TAVILY_INCLUDE_ANSWER,
      maxResults: TAVILY_MAX_RESULTS,
      country: TAVILY_COUNTRY || undefined,
    },
    engine: 'langgraph',
    tools: [...LANGGRAPH_TOOL_NAMES],
  });
});

aiRouter.post('/chat', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: 'Bạn đang gửi yêu cầu hơi nhanh. Vui lòng thử lại sau ít phút.',
      });
      return;
    }

    const body = (req.body || {}) as Partial<AiChatRequest>;
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';

    if (!rawMessage) {
      res.status(400).json({ error: 'Nội dung tin nhắn không được để trống.' });
      return;
    }

    const message = rawMessage.slice(0, AI_CHAT_MAX_MESSAGE_LENGTH);
    const lang: Language = body.lang === 'en' ? 'en' : 'vi';
    const isFollowUp = Boolean(body.isFollowUp);
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim().slice(0, 80)
        : undefined;

    const rawState = (body.currentState || {}) as Partial<AiChatRequest['currentState']>;
    const days = Array.isArray(rawState.days)
      ? rawState.days.slice(0, 6).map((d) => ({
          day: typeof d?.day === 'string' ? d.day.slice(0, 40) : '',
          title: typeof d?.title === 'string' ? d.title.slice(0, 120) : '',
          slots: Array.isArray(d?.slots)
            ? d.slots.slice(0, 10).map((s) => ({
                title: typeof s?.title === 'string' ? s.title.slice(0, 120) : '',
                location: typeof s?.location === 'string' ? s.location.slice(0, 120) : '',
                time: typeof s?.time === 'string' ? s.time.slice(0, 40) : '',
              }))
            : [],
        }))
      : [];

    const history: AiChatHistoryItem[] = Array.isArray(body.history)
      ? body.history
          .slice(-10)
          .filter((h) => h && typeof h.user === 'string' && typeof h.reply === 'string')
          .map((h) => ({
            user: h.user.slice(0, 800),
            reply: h.reply.slice(0, 1200),
          }))
      : [];

    const draftIntake = sanitizeDraftIntake(body.draftIntake);
    const currentExpenses = sanitizeCurrentExpenses(body.currentExpenses);

    const chatRequest: AiChatRequest = {
      message,
      lang,
      isFollowUp,
      currentState: {
        theme: asTheme(rawState.theme),
        duration: asDuration(rawState.duration),
        companion: asCompanion(rawState.companion),
        budget: asBudget(rawState.budget),
        days,
      },
      history,
      ...(sessionId ? { sessionId } : {}),
      ...(draftIntake ? { draftIntake } : {}),
      ...(currentExpenses ? { currentExpenses } : {}),
    };

    const result = await handleAiChat(chatRequest);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý yêu cầu trợ lý AI.' });
  }
});

aiRouter.post('/feedback', (req, res) => {
  try {
    const body = (req.body || {}) as Partial<AiFeedbackRequest>;
    const trace = submitAiTraceFeedback({
      traceId: typeof body.traceId === 'string' ? body.traceId : '',
      rating: body.rating as 1 | -1,
      comment: typeof body.comment === 'string' ? body.comment : undefined,
    });
    res.json({ ok: true, trace });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Không thể lưu phản hồi đánh giá.' });
  }
});

aiRouter.get('/traces', requireAuth, requireAdmin, (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;

    const result = listAiTraces({ limit, offset, status, intent });
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: 'Không thể tải danh sách AI traces.' });
  }
});
