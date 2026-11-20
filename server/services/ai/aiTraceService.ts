import { getDb, isUsingSupabase } from '../../db/database.ts';
import { getSupabaseAdmin } from '../../db/supabaseClient.ts';
import {
  type AiChatIntent,
  type AiFeedbackRequest,
  type AutoEvalResult,
  type BudgetFeasibilityResult,
  type CapacityAndLogisticsPlan,
  type IntakeState,
  type Language,
  type PurposeAlignedSelection,
  type TraceRecord,
} from '../../../src/types/index.ts';
import { ServiceError } from '../core/errors.ts';

interface AiTraceDbRow {
  trace_id: string;
  lang: Language;
  user_message: string;
  intent: AiChatIntent;
  status: 'needs_clarification' | 'completed';
  provider: string;
  intake_json: string | Record<string, unknown>;
  capacity_json: string | Record<string, unknown>;
  budget_json: string | Record<string, unknown>;
  purpose_json: string | Record<string, unknown>;
  eval_json: string | Record<string, unknown>;
  latency_ms: number;
  retry_count: number;
  feedback_rating: 1 | -1 | null;
  feedback_comment: string;
  created_at: string;
  updated_at: string;
}

function safeParseOptional<T>(raw: unknown): T | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    if (typeof raw === 'object' && Object.keys(raw as Record<string, unknown>).length === 0) {
      return undefined;
    }
    return raw as T;
  }
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
 * Persists a TraceRecord into Supabase (or SQLite fallback) `ai_traces`.
 */
export async function saveAiTrace(record: TraceRecord): Promise<void> {
  const now = new Date().toISOString();
  const createdAt = record.createdAt || now;
  const updatedAt = record.updatedAt || now;

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const existing = await getAiTraceById(record.traceId);
    const nextRating = record.feedbackRating ?? existing?.feedbackRating ?? null;
    const trimmedComment = (record.feedbackComment || '').trim();
    const nextComment = trimmedComment || existing?.feedbackComment || '';

    const { error } = await supabase.from('ai_traces').upsert(
      {
        trace_id: record.traceId,
        lang: record.lang,
        user_message: record.userMessage,
        intent: record.intent,
        status: record.status,
        provider: record.provider,
        intake_json: record.intake || {},
        capacity_json: record.capacityPlan || {},
        budget_json: record.budgetResult || {},
        purpose_json: record.purposeSelection || {},
        eval_json: record.evalResult || {},
        latency_ms: Math.max(0, Math.round(record.latencyMs)),
        retry_count: Math.max(0, Math.round(record.retryCount)),
        feedback_rating: nextRating,
        feedback_comment: nextComment,
        created_at: existing?.createdAt || createdAt,
        updated_at: updatedAt,
      },
      { onConflict: 'trace_id' }
    );
    if (error) {
      throw new Error(`Supabase saveAiTrace failed: ${error.message}`);
    }
    return;
  }

  const db = getDb();
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

export async function getAiTraceById(traceId: string): Promise<TraceRecord | null> {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_traces')
      .select('*')
      .eq('trace_id', traceId)
      .maybeSingle();
    if (error) throw new Error(`Supabase getAiTraceById failed: ${error.message}`);
    return data ? mapRowToTraceRecord(data as AiTraceDbRow) : null;
  }

  const db = getDb();
  const row = db
    .prepare('SELECT * FROM ai_traces WHERE trace_id = ?')
    .get(traceId) as AiTraceDbRow | undefined;
  return row ? mapRowToTraceRecord(row) : null;
}

/**
 * Records user feedback (thumbs up/down + optional comment) on a previously saved trace.
 */
export async function submitAiTraceFeedback(input: AiFeedbackRequest): Promise<TraceRecord> {
  const traceId = String(input.traceId || '').trim();
  if (!traceId) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'traceId là bắt buộc.');
  }
  if (input.rating !== 1 && input.rating !== -1) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'rating phải là 1 hoặc -1.');
  }

  const now = new Date().toISOString();
  const comment = typeof input.comment === 'string' ? input.comment.trim().slice(0, 1000) : '';

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const existing = await getAiTraceById(traceId);
    if (!existing) {
      throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy trace AI tương ứng.');
    }

    const { data, error } = await supabase
      .from('ai_traces')
      .update({
        feedback_rating: input.rating,
        feedback_comment: comment,
        updated_at: now,
      })
      .eq('trace_id', traceId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Supabase submitAiTraceFeedback failed: ${error?.message || 'Unknown error'}`);
    }
    return mapRowToTraceRecord(data as AiTraceDbRow);
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT trace_id FROM ai_traces WHERE trace_id = ?')
    .get(traceId) as { trace_id: string } | undefined;

  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy trace AI tương ứng.');
  }

  db.prepare(
    `UPDATE ai_traces
     SET feedback_rating = ?, feedback_comment = ?, updated_at = ?
     WHERE trace_id = ?`
  ).run(input.rating, comment, now, traceId);

  return (await getAiTraceById(traceId))!;
}

/**
 * Lists AI traces for admin observability, sorted newest first.
 */
export async function listAiTraces(filters?: {
  limit?: number;
  offset?: number;
  status?: string;
  intent?: string;
}): Promise<{ traces: TraceRecord[]; total: number }> {
  const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 30));
  const offset = Math.max(0, Number(filters?.offset) || 0);
  const normalizedIntent =
    filters?.intent === 'plan_trip' ? 'update_itinerary' : filters?.intent;

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('ai_traces')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status === 'needs_clarification' || filters?.status === 'completed') {
      query = query.eq('status', filters.status);
    }
    if (
      normalizedIntent === 'general_qa' ||
      normalizedIntent === 'update_itinerary' ||
      normalizedIntent === 'modify_stops'
    ) {
      query = query.eq('intent', normalizedIntent);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(`Supabase listAiTraces failed: ${error.message}`);

    return {
      traces: ((data || []) as AiTraceDbRow[]).map(mapRowToTraceRecord),
      total: count ?? 0,
    };
  }

  const db = getDb();
  const whereParts: string[] = ['1=1'];
  const params: Array<string | number> = [];

  if (filters?.status === 'needs_clarification' || filters?.status === 'completed') {
    whereParts.push('status = ?');
    params.push(filters.status);
  }
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
