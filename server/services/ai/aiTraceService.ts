import { getDb } from '../../db/database.ts';
import {
  AiChatIntent,
  AiFeedbackRequest,
  AutoEvalResult,
  BudgetFeasibilityResult,
  CapacityAndLogisticsPlan,
  IntakeState,
  Language,
  PurposeAlignedSelection,
  TraceRecord,
} from '../../../src/types/index.ts';
import { ServiceError } from '../core/errors.ts';

interface AiTraceDbRow {
  trace_id: string;
  lang: Language;
  user_message: string;
  intent: AiChatIntent;
  status: 'needs_clarification' | 'completed';
  provider: string;
  intake_json: string;
  capacity_json: string;
  budget_json: string;
  purpose_json: string;
  eval_json: string;
  latency_ms: number;
  retry_count: number;
  feedback_rating: 1 | -1 | null;
  feedback_comment: string;
  created_at: string;
  updated_at: string;
}

function safeParseOptional<T>(raw: string | null | undefined): T | undefined {
  if (!raw || raw === '{}' || raw === 'null') return undefined;
  try {
    const parsed = JSON.parse(raw) as T;
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function mapRowToTraceRecord(row: AiTraceDbRow): TraceRecord {
  return {
    traceId: row.trace_id,
    lang: row.lang === 'en' ? 'en' : 'vi',
    userMessage: row.user_message,
    intent: row.intent,
    status: row.status,
    provider: row.provider,
    intake: safeParseOptional<IntakeState>(row.intake_json),
    capacityPlan: safeParseOptional<CapacityAndLogisticsPlan>(row.capacity_json),
    budgetResult: safeParseOptional<BudgetFeasibilityResult>(row.budget_json),
    purposeSelection: safeParseOptional<PurposeAlignedSelection>(row.purpose_json),
    evalResult: safeParseOptional<AutoEvalResult>(row.eval_json),
    latencyMs: row.latency_ms,
    retryCount: row.retry_count,
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Persists a TraceRecord into SQLite `ai_traces`.
 */
export function saveAiTrace(record: TraceRecord): void {
  const db = getDb();
  const now = new Date().toISOString();
  const createdAt = record.createdAt || now;
  const updatedAt = record.updatedAt || now;

  db.prepare(
    `INSERT INTO ai_traces (
      trace_id, lang, user_message, intent, status, provider,
      intake_json, capacity_json, budget_json, purpose_json, eval_json,
      latency_ms, retry_count, feedback_rating, feedback_comment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(trace_id) DO UPDATE SET
      status = excluded.status,
      provider = excluded.provider,
      intake_json = excluded.intake_json,
      capacity_json = excluded.capacity_json,
      budget_json = excluded.budget_json,
      purpose_json = excluded.purpose_json,
      eval_json = excluded.eval_json,
      latency_ms = excluded.latency_ms,
      retry_count = excluded.retry_count,
      feedback_rating = COALESCE(excluded.feedback_rating, ai_traces.feedback_rating),
      feedback_comment = CASE
        WHEN excluded.feedback_comment != '' THEN excluded.feedback_comment
        ELSE ai_traces.feedback_comment
      END,
      updated_at = excluded.updated_at`
  ).run(
    record.traceId,
    record.lang,
    record.userMessage,
    record.intent,
    record.status,
    record.provider,
    JSON.stringify(record.intake || {}),
    JSON.stringify(record.capacityPlan || {}),
    JSON.stringify(record.budgetResult || {}),
    JSON.stringify(record.purposeSelection || {}),
    JSON.stringify(record.evalResult || {}),
    Math.max(0, Math.round(record.latencyMs)),
    Math.max(0, Math.round(record.retryCount)),
    record.feedbackRating ?? null,
    (record.feedbackComment || '').trim(),
    createdAt,
    updatedAt
  );
}

export function getAiTraceById(traceId: string): TraceRecord | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM ai_traces WHERE trace_id = ?')
    .get(traceId) as AiTraceDbRow | undefined;
  return row ? mapRowToTraceRecord(row) : null;
}

/**
 * Records user feedback (thumbs up/down + optional comment) on a previously saved trace.
 */
export function submitAiTraceFeedback(input: AiFeedbackRequest): TraceRecord {
  const traceId = String(input.traceId || '').trim();
  if (!traceId) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'traceId là bắt buộc.');
  }
  if (input.rating !== 1 && input.rating !== -1) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'rating phải là 1 hoặc -1.');
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT trace_id FROM ai_traces WHERE trace_id = ?')
    .get(traceId) as { trace_id: string } | undefined;

  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy trace AI tương ứng.');
  }

  const now = new Date().toISOString();
  const comment = typeof input.comment === 'string' ? input.comment.trim().slice(0, 1000) : '';

  db.prepare(
    `UPDATE ai_traces
     SET feedback_rating = ?, feedback_comment = ?, updated_at = ?
     WHERE trace_id = ?`
  ).run(input.rating, comment, now, traceId);

  return getAiTraceById(traceId)!;
}

/**
 * Lists AI traces for admin observability, sorted newest first.
 */
export function listAiTraces(filters?: {
  limit?: number;
  offset?: number;
  status?: string;
  intent?: string;
}): { traces: TraceRecord[]; total: number } {
  const db = getDb();
  const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 30));
  const offset = Math.max(0, Number(filters?.offset) || 0);

  const whereParts: string[] = ['1=1'];
  const params: Array<string | number> = [];

  if (filters?.status === 'needs_clarification' || filters?.status === 'completed') {
    whereParts.push('status = ?');
    params.push(filters.status);
  }
  const normalizedIntent =
    filters?.intent === 'plan_trip' ? 'update_itinerary' : filters?.intent;
  if (
    normalizedIntent === 'general_qa' ||
    normalizedIntent === 'update_itinerary' ||
    normalizedIntent === 'modify_stops'
  ) {
    whereParts.push('intent = ?');
    params.push(normalizedIntent);
  }

  const whereClause = whereParts.join(' AND ');
  const countRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM ai_traces WHERE ${whereClause}`)
    .get(...params) as { cnt: number };

  const rows = db
    .prepare(
      `SELECT * FROM ai_traces
       WHERE ${whereClause}
       ORDER BY created_at DESC, rowid DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as unknown as AiTraceDbRow[];

  return {
    traces: rows.map(mapRowToTraceRecord),
    total: countRow.cnt,
  };
}
