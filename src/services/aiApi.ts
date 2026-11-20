import { AiChatRequest, AiChatResponse, AiFeedbackRequest, AiStatusResponse } from '../types';

export class AiApiError extends Error {
  readonly status: number;
  readonly isTimeout: boolean;

  constructor(message: string, opts?: { status?: number; isTimeout?: boolean }) {
    super(message);
    this.name = 'AiApiError';
    this.status = opts?.status ?? 0;
    this.isTimeout = Boolean(opts?.isTimeout);
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export const aiApi = {
  async getStatus(): Promise<AiStatusResponse> {
    const res = await fetch('/api/ai/status');
    if (!res.ok) {
      throw new AiApiError(`AI status check failed (${res.status})`, { status: res.status });
    }
    return (await res.json()) as AiStatusResponse;
  },

  async chat(
    payload: AiChatRequest,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<AiChatResponse> {
    const timeoutMs = options?.timeoutMs ?? 35000;
    const controller = new AbortController();
    let timedOut = false;

    const onExternalAbort = () => controller.abort();
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const timer = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => ({}))) as AiChatResponse & { error?: string };
      if (!res.ok) {
        throw new AiApiError(data.error || `AI chat request failed (${res.status})`, {
          status: res.status,
        });
      }
      return data;
    } catch (err) {
      if (err instanceof AiApiError) {
        throw err;
      }
      if (timedOut) {
        throw new AiApiError(
          payload.lang === 'en'
            ? 'The AI request timed out while searching external sources. Please try again.'
            : 'Yêu cầu tra cứu AI mất nhiều thời gian hơn dự kiến. Vui lòng thử lại nhé.',
          { status: 408, isTimeout: true }
        );
      }
      throw err;
    } finally {
      globalThis.clearTimeout(timer);
      if (options?.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
    }
  },

  async submitFeedback(payload: AiFeedbackRequest): Promise<{ ok: boolean }> {
    const res = await fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok) {
      throw new AiApiError(data.error || `AI feedback request failed (${res.status})`, {
        status: res.status,
      });
    }
    return { ok: data.ok !== false };
  },
};
