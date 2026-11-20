import { tavily } from '@tavily/core';
import {
  OpenInferenceSpanKind,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  TOOL_PARAMETERS,
} from '@arizeai/openinference-semantic-conventions';
import {
  GEMINI_API_KEY,
  GEMINI_DECISION_MODEL,
  getTavilyApiKey,
  TAVILY_COUNTRY,
  TAVILY_INCLUDE_ANSWER,
  TAVILY_MAX_RESULTS,
  TAVILY_SEARCH_DEPTH,
  TAVILY_TIMEOUT_MS,
} from '../../config.ts';
import { AiCitation } from '../../../src/types/index.ts';
import { withOpenInferenceSpan } from './arizeTelemetry.ts';

export interface TavilySearchClient {
  search: (
    query: string,
    options?: {
      searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast';
      maxResults?: number;
      includeAnswer?: boolean | 'basic' | 'advanced';
      country?: string;
      timeout?: number;
    }
  ) => Promise<{
    answer?: string;
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
    }>;
  }>;
}

export interface TavilyPriceLookupResult {
  placeTitle: string;
  ticketVnd: number;
  estimatedSpendVnd: number;
  priceNote: string;
  sourceUrl: string;
  citations: AiCitation[];
  verified: boolean;
  usedDecisionApi: boolean;
}

export type TavilyQaLookupStatus =
  | 'ok'
  | 'missing_api_key'
  | 'disabled'
  | 'empty_query'
  | 'timeout'
  | 'api_error'
  | 'no_results';

export interface TavilyQaLookupResult {
  query: string;
  answer?: string;
  snippets: Array<{ title: string; url: string; content: string }>;
  citations: AiCitation[];
  fromCache?: boolean;
  status?: TavilyQaLookupStatus;
  error?: string;
}

const QA_CACHE_TTL_MS = 15 * 60 * 1000;
const QA_CACHE_MAX_ENTRIES = 100;
const tavilyQaCache = new Map<string, { expiresAt: number; data: TavilyQaLookupResult }>();
let warnedMissingTavilyKey = false;

export function clearTavilyQaCache(): void {
  tavilyQaCache.clear();
}

function foldVietnameseSearchText(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function buildTavilyQaQuery(rawQuery: string): string {
  const cleaned = String(rawQuery || '').trim();
  if (!cleaned) return '';
  const folded = foldVietnameseSearchText(cleaned);
  const hasProvinceOrCityAnchor =
    /(dak\s*lak|daklak|buon\s*ma\s*thuot|\bbmt\b|ban\s*me|tay\s*nguyen)/.test(folded);
  if (hasProvinceOrCityAnchor) {
    return cleaned;
  }
  const hasSubLocationAnchor =
    /(ho\s*lak|buon\s*jun|buon\s*le|buon\s*don|ban\s*don|dray\s*nur|dray\s*sap|yok\s*don|ea\s*kao|chu\s*yang\s*sin|kotam|ko\s*tam|tong\s*ju|ako\s*dhong|bao\s*tang\s*the\s*gioi\s*ca\s*phe|chu\s*dang\s*ya)/.test(
      folded
    );
  // Appending "Đắk Lắk" without forcing "Buôn Ma Thuột" keeps rural attraction searches (e.g., Hồ Lắk, Buôn Jun) accurate.
  return hasSubLocationAnchor ? `${cleaned} Đắk Lắk` : `${cleaned} Đắk Lắk Buôn Ma Thuột`;
}

/**
 * Deterministically parses VND ticket / activity amounts from Vietnamese or English search snippets.
 */
export function extractVndPricesFromText(text: string): {
  amounts: number[];
  ticketVnd: number | null;
  estimatedSpendVnd: number | null;
} {
  const cleaned = String(text || '').replace(/\u00a0/g, ' ');
  const amounts: number[] = [];

  // Match price ranges like "75.000 - 150.000đ" where the lower bound omits the trailing currency unit
  const rangeRegex =
    /(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*[-–~]\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*(?:đồng|vnđ|vnd|đ|d)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(rangeRegex)) {
    for (const group of [match[1], match[2]]) {
      const val = Number(group.replace(/[.,\s]/g, ''));
      if (Number.isFinite(val) && val >= 10000 && val <= 10000000) {
        amounts.push(Math.round(val));
      }
    }
  }

  // Match patterns like "150.000đ", "150,000 VND", "150 000 vnđ", "150k"
  const fullNumberRegex =
    /(\d{1,3}(?:[.,\s]\d{3})+|\d{4,8})\s*(?:đồng|vnđ|vnd|đ|d)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(fullNumberRegex)) {
    const rawNum = match[1].replace(/[.,\s]/g, '');
    const val = Number(rawNum);
    if (Number.isFinite(val) && val >= 10000 && val <= 10000000) {
      amounts.push(Math.round(val));
    }
  }

  const kNumberRegex = /(\d{2,4})\s*k(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(kNumberRegex)) {
    const val = Number(match[1]) * 1000;
    if (Number.isFinite(val) && val >= 10000 && val <= 10000000) {
      amounts.push(Math.round(val));
    }
  }

  const millionRegex = /(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(millionRegex)) {
    const normalized = match[1].replace(',', '.');
    const val = Number(normalized) * 1000000;
    if (Number.isFinite(val) && val >= 100000 && val <= 20000000) {
      amounts.push(Math.round(val));
    }
  }

  const uniqueSorted = Array.from(new Set(amounts)).sort((a, b) => a - b);
  const mentionsFree = /(?:^|[^\p{L}\p{N}_])(miễn phí|free entry|free admission|không mất vé)(?=$|[^\p{L}\p{N}_])/iu.test(
    cleaned
  );
  const mentionsExplicitFreeAdmission =
    /(miễn\s*phí\s*(?:vé|vào\s*cổng|tham\s*quan)|vé\s*(?:vào\s*cổng\s*)?miễn\s*phí|free\s+entry|free\s+admission|không\s+mất\s+vé)/iu.test(
      cleaned
    );
  const mentionsPaidTicketClause =
    /(?:giá\s*vé|vé\s*(?:vào\s*cổng|tham\s*quan|người\s*lớn|lẻ))\s*(?:là|:|khoảng|~)?\s*\d/iu.test(
      cleaned
    );

  if (uniqueSorted.length === 0) {
    return {
      amounts: [],
      ticketVnd: mentionsFree ? 0 : null,
      estimatedSpendVnd: null,
    };
  }

  const isFreeAdmission = mentionsExplicitFreeAdmission && !mentionsPaidTicketClause;
  const ticketVnd = isFreeAdmission ? 0 : uniqueSorted[0];
  const estimatedSpendVnd =
    uniqueSorted.length > 1 ? uniqueSorted[Math.min(1, uniqueSorted.length - 1)] : uniqueSorted[0];

  return {
    amounts: uniqueSorted,
    ticketVnd,
    estimatedSpendVnd,
  };
}

/**
 * Optional Gemini Decisions API (`noul` yes/no verification gate) to confirm snippet relevance
 * and price plausibility before caching Tavily results into SQLite.
 */
export async function verifyTavilyPriceWithDecisionGate(
  placeTitle: string,
  snippets: Array<{ title: string; url: string; content: string }>,
  extractedTicketVnd: number | null,
  fetchFn: typeof fetch = fetch
): Promise<{ verified: boolean; reason: string; usedDecisionApi: boolean }> {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();

  if (!decisionModel || !apiKey || snippets.length === 0) {
    return {
      verified: true,
      reason: 'deterministic-snippet-parsing',
      usedDecisionApi: false,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const inputSummary = [
      `Target place: ${placeTitle} (Dak Lak, Vietnam)`,
      `Parsed ticket VND: ${extractedTicketVnd ?? 'none'}`,
      ...snippets.slice(0, 3).map((s, idx) => `[${idx + 1}] ${s.title} (${s.url}): ${s.content.slice(0, 400)}`),
    ].join('\n');

    const response = await fetchFn('https://generativelanguage.googleapis.com/v1beta/decisions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputSummary,
        questions: {
          is_relevant_place: {
            type: 'noul',
            instructions: `Do the search snippets specifically describe "${placeTitle}" in Dak Lak, Vietnam?`,
          },
          is_plausible_price: {
            type: 'noul',
            instructions:
              'Is the parsed VND ticket/activity price plausible and consistent with the snippets (not an unrelated tour package or spam)?',
          },
        },
      }),
    });

    if (!response.ok) {
      return {
        verified: true,
        reason: `decisions-api-http-${response.status}-fallback`,
        usedDecisionApi: false,
      };
    }

    const data = (await response.json()) as {
      answers?: {
        is_relevant_place?: { noul?: number };
        is_plausible_price?: { noul?: number };
      };
    };

    const relScore = data.answers?.is_relevant_place?.noul;
    const priceScore = data.answers?.is_plausible_price?.noul;

    if (typeof relScore === 'number' && typeof priceScore === 'number') {
      const verified = relScore >= 0.5 && priceScore >= 0.5;
      return {
        verified,
        reason: `gemini-decisions(rel=${relScore.toFixed(2)},price=${priceScore.toFixed(2)})`,
        usedDecisionApi: true,
      };
    }

    return {
      verified: true,
      reason: 'decisions-api-malformed-fallback',
      usedDecisionApi: false,
    };
  } catch {
    return {
      verified: true,
      reason: 'decisions-api-error-fallback',
      usedDecisionApi: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Looks up updated ticket/expense information for a Đắk Lắk attraction via Tavily.
 * Gracefully no-ops (`null`) if `TAVILY_API_KEY` is missing (unless a mock client is injected).
 */
export async function searchPlacePriceWithTavily(
  placeTitle: string,
  areaCluster: string,
  options?: {
    tavilyClient?: TavilySearchClient;
    fetchFn?: typeof fetch;
    fallbackTicketVnd?: number;
    fallbackEstimatedSpendVnd?: number;
    timeoutMs?: number;
  }
): Promise<TavilyPriceLookupResult | null> {
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    return null;
  }

  const query = `giá vé tham quan ${placeTitle} ${areaCluster} Đắk Lắk mới nhất VND`;
  const toolParamsSchema = JSON.stringify({
    type: 'object',
    properties: {
      query: { type: 'string' },
      placeTitle: { type: 'string' },
      areaCluster: { type: 'string' },
    },
    required: ['query', 'placeTitle'],
  });

  return withOpenInferenceSpan(
    'tavily_search',
    {
      kind: OpenInferenceSpanKind.TOOL,
      input: { query, placeTitle, areaCluster },
      attributes: {
        [TOOL_NAME]: 'tavily_search',
        [TOOL_DESCRIPTION]:
          'Search real-time attraction ticket prices and local travel expenses in Dak Lak via Tavily.',
        [TOOL_PARAMETERS]: toolParamsSchema,
      },
      formatOutput: (res) =>
        res
          ? {
              placeTitle: res.placeTitle,
              ticketVnd: res.ticketVnd,
              estimatedSpendVnd: res.estimatedSpendVnd,
              sourceUrl: res.sourceUrl,
              verified: res.verified,
            }
          : { result: null },
    },
    async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const client: TavilySearchClient =
          options?.tavilyClient || (tavily({ apiKey }) as unknown as TavilySearchClient);
        const timeoutMs = options?.timeoutMs ?? TAVILY_TIMEOUT_MS;
        const TIMEOUT_SENTINEL = Symbol('tavily_price_timeout');
        const timeoutPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
          timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
        });

        const searchParams = {
          searchDepth: TAVILY_SEARCH_DEPTH,
          maxResults: 4,
          includeAnswer: TAVILY_INCLUDE_ANSWER,
          ...(TAVILY_COUNTRY ? { country: TAVILY_COUNTRY } : {}),
          timeout: Math.max(2, Math.ceil(timeoutMs / 1000)),
        };

        const response = await Promise.race([
          client.search(query, searchParams),
          timeoutPromise,
        ]);

        if (response === TIMEOUT_SENTINEL || !response) {
          if (response === TIMEOUT_SENTINEL) {
            console.warn(`[Tavily Service] Price lookup timed out after ${timeoutMs}ms for "${placeTitle}".`);
          }
          return null;
        }

        const results = Array.isArray(response?.results) ? response.results : [];
        const snippets = results
          .filter((r) => typeof r?.url === 'string' && r.url.startsWith('http'))
          .map((r) => ({
            title: String(r.title || placeTitle).trim(),
            url: String(r.url).trim(),
            content: String(r.content || '').trim(),
          }));

        const combinedText = [
          typeof response?.answer === 'string' ? response.answer : '',
          ...snippets.map((s) => `${s.title} ${s.content}`),
        ]
          .filter(Boolean)
          .join('\n');

        if (!combinedText.trim() && snippets.length === 0) {
          return null;
        }

        const parsed = extractVndPricesFromText(combinedText);
        const gate = await withOpenInferenceSpan(
          'gemini_decisions_price_gate',
          {
            kind: OpenInferenceSpanKind.GUARDRAIL,
            input: { placeTitle, parsedTicketVnd: parsed.ticketVnd, snippetCount: snippets.length },
          },
          () =>
            verifyTavilyPriceWithDecisionGate(
              placeTitle,
              snippets,
              parsed.ticketVnd,
              options?.fetchFn
            )
        );

        if (!gate.verified) {
          return null;
        }

        const fallbackTicket = options?.fallbackTicketVnd ?? 0;
        const fallbackSpend = options?.fallbackEstimatedSpendVnd ?? Math.max(fallbackTicket, 100000);
        const ticketVnd = parsed.ticketVnd !== null ? parsed.ticketVnd : fallbackTicket;
        const estimatedSpendVnd =
          parsed.estimatedSpendVnd !== null
            ? Math.max(ticketVnd, parsed.estimatedSpendVnd)
            : Math.max(ticketVnd, fallbackSpend);

        const primarySnippet = snippets[0];
        const citations: AiCitation[] = snippets.slice(0, 2).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.content.slice(0, 180),
          source: 'tavily',
        }));

        return {
          placeTitle,
          ticketVnd,
          estimatedSpendVnd,
          priceNote:
            parsed.ticketVnd !== null
              ? `Cập nhật từ Tavily (${gate.reason})`
              : `Tham chiếu Tavily không có vé cụ thể, giữ mức ước tính (${gate.reason})`,
          sourceUrl: primarySnippet?.url || '',
          citations,
          verified: gate.verified,
          usedDecisionApi: gate.usedDecisionApi,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown Tavily error';
        console.warn(`[Tavily Service] Lookup failed for "${placeTitle}":`, msg);
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  );
}

/**
 * Performs a real-time web search via Tavily for general Q&A and external Đắk Lắk information
 * (places outside the static directory, hotels/amenities, transport, weather, festivals, local food, etc.).
 */
export async function searchGeneralQaWithTavily(
  queryText: string,
  options?: {
    enableTavily?: boolean;
    tavilyClient?: TavilySearchClient;
    timeoutMs?: number;
    maxResults?: number;
    bypassCache?: boolean;
  }
): Promise<TavilyQaLookupResult> {
  const searchQuery = buildTavilyQaQuery(queryText);

  if (options?.enableTavily === false) {
    return {
      query: searchQuery,
      snippets: [],
      citations: [],
      status: 'disabled',
    };
  }

  if (!searchQuery) {
    return {
      query: '',
      snippets: [],
      citations: [],
      status: 'empty_query',
    };
  }

  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    if (!warnedMissingTavilyKey) {
      warnedMissingTavilyKey = true;
      console.warn(
        '[Tavily Service] TAVILY_API_KEY is empty — live web search skipped (set TAVILY_API_KEY in .env or .env.local).'
      );
    }
    return {
      query: searchQuery,
      snippets: [],
      citations: [],
      status: 'missing_api_key',
      error: 'TAVILY_API_KEY is not configured',
    };
  }

  const cacheKey = searchQuery.toLowerCase();
  const useCache = !options?.tavilyClient && !options?.bypassCache;
  if (useCache) {
    const cached = tavilyQaCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, fromCache: true };
    }
    if (cached) {
      tavilyQaCache.delete(cacheKey);
    }
  }

  const timeoutMs = options?.timeoutMs ?? TAVILY_TIMEOUT_MS;
  const maxResults = options?.maxResults ?? TAVILY_MAX_RESULTS;
  const searchOptions = {
    searchDepth: TAVILY_SEARCH_DEPTH,
    maxResults,
    includeAnswer: TAVILY_INCLUDE_ANSWER,
    ...(TAVILY_COUNTRY ? { country: TAVILY_COUNTRY } : {}),
    timeout: Math.max(2, Math.ceil(timeoutMs / 1000)),
  };

  const toolParamsSchema = JSON.stringify({
    type: 'object',
    properties: {
      query: { type: 'string' },
      searchDepth: { type: 'string' },
      includeAnswer: { type: ['boolean', 'string'] },
      maxResults: { type: 'number' },
      country: { type: 'string' },
      timeoutMs: { type: 'number' },
    },
    required: ['query'],
  });

  return withOpenInferenceSpan(
    'tavily_qa_search',
    {
      kind: OpenInferenceSpanKind.TOOL,
      input: {
        query: searchQuery,
        rawQuery: queryText,
        ...searchOptions,
        timeoutMs,
      },
      attributes: {
        [TOOL_NAME]: 'tavily_qa_search',
        [TOOL_DESCRIPTION]:
          'Search live web knowledge and external information for Dak Lak travel Q&A via Tavily.',
        [TOOL_PARAMETERS]: toolParamsSchema,
      },
      formatOutput: (res) => ({
        query: res.query,
        status: res.status || 'ok',
        ...(res.error ? { error: res.error } : {}),
        hasAnswer: Boolean(res.answer),
        snippetCount: res.snippets.length,
        citationUrls: res.citations.map((c) => c.url),
      }),
    },
    async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const client: TavilySearchClient =
          options?.tavilyClient || (tavily({ apiKey }) as unknown as TavilySearchClient);
        const TIMEOUT_SENTINEL = Symbol('tavily_qa_timeout');

        const timeoutPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
          timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
        });

        const response = await Promise.race([
          client.search(searchQuery, searchOptions),
          timeoutPromise,
        ]);

        if (response === TIMEOUT_SENTINEL) {
          console.warn(`[Tavily Service] Q&A search timed out after ${timeoutMs}ms for "${searchQuery}".`);
          return {
            query: searchQuery,
            snippets: [],
            citations: [],
            status: 'timeout',
            error: `Tavily request timed out after ${timeoutMs}ms`,
          };
        }

        if (!response) {
          return {
            query: searchQuery,
            snippets: [],
            citations: [],
            status: 'no_results',
          };
        }

        const answer =
          typeof response.answer === 'string' && response.answer.trim()
            ? response.answer.trim()
            : undefined;

        const rawResults = Array.isArray(response.results) ? response.results : [];
        const snippets = rawResults
          .filter((r) => typeof r?.url === 'string' && r.url.startsWith('http'))
          .slice(0, maxResults)
          .map((r) => ({
            title: String(r.title || 'Tavily Reference').trim(),
            url: String(r.url).trim(),
            content: String(r.content || '').trim().slice(0, 500),
          }));

        const citations: AiCitation[] = snippets.slice(0, 3).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.content.slice(0, 180),
          source: 'tavily',
        }));

        const status: TavilyQaLookupStatus =
          answer || snippets.length > 0 ? 'ok' : 'no_results';

        const lookupResult: TavilyQaLookupResult = {
          query: searchQuery,
          ...(answer ? { answer } : {}),
          snippets,
          citations,
          status,
        };

        if (useCache && (answer || snippets.length > 0)) {
          if (tavilyQaCache.size >= QA_CACHE_MAX_ENTRIES) {
            const oldestKey = tavilyQaCache.keys().next().value;
            if (oldestKey) tavilyQaCache.delete(oldestKey);
          }
          tavilyQaCache.set(cacheKey, {
            expiresAt: Date.now() + QA_CACHE_TTL_MS,
            data: lookupResult,
          });
        }

        return lookupResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown Tavily Q&A error';
        console.warn(`[Tavily Service] Q&A search failed for "${searchQuery}":`, msg);
        return {
          query: searchQuery,
          snippets: [],
          citations: [],
          status: 'api_error',
          error: msg,
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  );
}
