import { Attributes, Context, Span, SpanStatusCode, context, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { getAttributesFromContext, setSession } from '@arizeai/openinference-core';
import {
  INPUT_VALUE,
  OUTPUT_VALUE,
  OpenInferenceSpanKind,
  SemanticConventions,
  SEMRESATTRS_PROJECT_NAME,
} from '@arizeai/openinference-semantic-conventions';
import {
  ARIZE_API_KEY,
  ARIZE_COLLECTOR_ENDPOINT,
  ARIZE_PROJECT_NAME,
  ARIZE_SPACE_ID,
} from '../config.ts';

let providerInstance: NodeTracerProvider | null = null;
let initialized = false;

function buildArizeTracesUrl(baseEndpoint: string): string {
  const trimmed = baseEndpoint.trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://otlp.arize.com/v1/traces';
  if (trimmed.endsWith('/v1/traces')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/traces`;
  return `${trimmed}/v1/traces`;
}

export function isArizeConfigured(): boolean {
  return Boolean(ARIZE_API_KEY.trim() && ARIZE_SPACE_ID.trim());
}

/**
 * Initializes the global OpenTelemetry TracerProvider targeting Arize AX.
 * Safe no-op when `ARIZE_API_KEY` or `ARIZE_SPACE_ID` is unset.
 */
export function initArizeTelemetry(): boolean {
  if (initialized && providerInstance) return true;

  if (!isArizeConfigured()) {
    return false;
  }

  initialized = true;

  const projectName = ARIZE_PROJECT_NAME.trim() || 'dak-lak-travel-concierge';
  const url = buildArizeTracesUrl(ARIZE_COLLECTOR_ENDPOINT);

  const exporter = new OTLPTraceExporter({
    url,
    headers: {
      'arize-space-id': ARIZE_SPACE_ID.trim(),
      'arize-api-key': ARIZE_API_KEY.trim(),
    },
  });

  const processor =
    process.env.NODE_ENV === 'production'
      ? new BatchSpanProcessor(exporter)
      : new SimpleSpanProcessor(exporter);

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: projectName,
      [SEMRESATTRS_PROJECT_NAME]: projectName,
    }),
    spanProcessors: [processor],
  });

  provider.register();
  providerInstance = provider;

  console.log(
    `[Arize AX] Tracing initialized -> project="${projectName}", endpoint="${url}", space="${ARIZE_SPACE_ID.trim()}"`
  );
  return true;
}

export function getArizeTracer() {
  return trace.getTracer('dak-lak-ai-concierge');
}

export function getActiveOtelTraceId(): string | undefined {
  return trace.getActiveSpan()?.spanContext().traceId;
}

export async function flushArizeTelemetry(): Promise<void> {
  if (!providerInstance) return;
  await providerInstance.forceFlush();
}

export async function shutdownArizeTelemetry(): Promise<void> {
  if (!providerInstance) return;
  await providerInstance.forceFlush();
  await providerInstance.shutdown();
  providerInstance = null;
  initialized = false;
}

export function toSafeSpanValue(value: unknown, maxLen = 12000): string {
  try {
    const raw =
      typeof value === 'string'
        ? value
        : JSON.stringify(value ?? '', (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
    if (!raw) return '';
    return raw.length > maxLen ? `${raw.slice(0, maxLen)}…[truncated]` : raw;
  } catch {
    const fallback = String(value ?? '');
    return fallback.length > maxLen ? `${fallback.slice(0, maxLen)}…[truncated]` : fallback;
  }
}

export async function withSessionScope<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  if (!sessionId.trim()) return fn();
  const sessionCtx: Context = setSession(context.active(), { sessionId: sessionId.trim() });
  return context.with(sessionCtx, fn);
}

export interface OpenInferenceSpanOptions<T> {
  kind: OpenInferenceSpanKind;
  input: unknown;
  attributes?: Attributes;
  formatOutput?: (result: T) => unknown;
  onSuccess?: (span: Span, result: T) => void;
}

/**
 * Wraps an async or sync step in an OpenInference-compliant OTel span.
 * Guarantees `openinference.span.kind`, `input.value`, `output.value`, and terminal status (`OK` or `ERROR`).
 */
export async function withOpenInferenceSpan<T>(
  name: string,
  opts: OpenInferenceSpanOptions<T>,
  fn: (span: Span) => Promise<T> | T
): Promise<T> {
  const tracer = getArizeTracer();
  return tracer.startActiveSpan(name, async (span) => {
    const ctxAttrs = getAttributesFromContext(context.active());
    if (ctxAttrs) {
      span.setAttributes(ctxAttrs);
    }
    span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, opts.kind);
    span.setAttribute(INPUT_VALUE, toSafeSpanValue(opts.input));
    if (opts.attributes) {
      span.setAttributes(opts.attributes);
    }

    try {
      const result = await fn(span);
      const outputPayload = opts.formatOutput ? opts.formatOutput(result) : result;
      span.setAttribute(OUTPUT_VALUE, toSafeSpanValue(outputPayload));
      if (opts.onSuccess) {
        opts.onSuccess(span, result);
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      span.recordException(errorObj);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });
      span.setAttribute(OUTPUT_VALUE, toSafeSpanValue({ error: errorObj.message }));
      throw err;
    } finally {
      span.end();
    }
  });
}
