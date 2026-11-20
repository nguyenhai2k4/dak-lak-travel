import { GEMINI_API_KEY, GEMINI_MODEL } from '../config.ts';
import { GlossaryItem } from '../../src/types/index.ts';
import { sanitizeRichHtml } from './sanitize.ts';

export interface TranslatablePostPayload {
  title: string;
  excerpt: string;
  category: string;
  location: string;
  readTime: string;
  cta: string;
  previewParagraphs: string[];
  contentHtml: string;
  quote: string;
  quoteSource: string;
  glossary: GlossaryItem[];
}

export interface TranslatedPostPayload extends TranslatablePostPayload {
  provider: string;
}

export interface TranslationProvider {
  name: string;
  translatePostToEnglish(input: TranslatablePostPayload): Promise<TranslatedPostPayload>;
}

class GeminiTranslationProvider implements TranslationProvider {
  name = 'gemini-ai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async translatePostToEnglish(input: TranslatablePostPayload): Promise<TranslatedPostPayload> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const prompt = [
      'Translate the following Vietnamese travel editorial blog post about Đắk Lắk (Central Highlands, Vietnam) into natural, evocative editorial English.',
      'Rules:',
      '1. Preserve proper Vietnamese place and cultural names appropriately (e.g., Đắk Lắk, Buôn Ma Thuột, Ê Đê, M’nông, Sêrêpốk, Dray Nur, Hồ Lắk, Yok Đôn, Knah, Kpan, T’rưng).',
      '2. For "contentHtml", preserve ALL HTML tags, attributes (like img src, alt, href), and document structure intact — translate only human-readable text and img alt attributes.',
      '3. Return strictly valid JSON matching the exact input keys.',
      '',
      JSON.stringify(input),
    ].join('\n');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini translation API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini translation returned empty content');
    }

    const parsed = JSON.parse(rawText) as Partial<TranslatablePostPayload>;
    return {
      title: parsed.title || input.title,
      excerpt: parsed.excerpt || input.excerpt,
      category: parsed.category || input.category,
      location: parsed.location || input.location,
      readTime: parsed.readTime || translateReadTimeFallback(input.readTime),
      cta: parsed.cta || 'Read full story',
      previewParagraphs: Array.isArray(parsed.previewParagraphs)
        ? parsed.previewParagraphs
        : input.previewParagraphs,
      contentHtml: sanitizeRichHtml(parsed.contentHtml || input.contentHtml),
      quote: parsed.quote || input.quote,
      quoteSource: parsed.quoteSource || input.quoteSource,
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary : input.glossary,
      provider: `${this.name}:${this.model}`,
    };
  }
}

function translateReadTimeFallback(viReadTime: string): string {
  const match = viReadTime.match(/\d+/);
  if (match) return `${match[0]} min read`;
  return viReadTime;
}

class LocalFallbackTranslationProvider implements TranslationProvider {
  name = 'local-fallback';

  async translatePostToEnglish(input: TranslatablePostPayload): Promise<TranslatedPostPayload> {
    // Structural & metadata fallback when no external AI key is configured yet.
    // Admins can edit EN fields manually in the CMS or click "Re-translate with AI" once GEMINI_API_KEY is set.
    return {
      title: input.title,
      excerpt: input.excerpt,
      category: input.category,
      location: input.location,
      readTime: translateReadTimeFallback(input.readTime),
      cta: 'Explore story',
      previewParagraphs: [...input.previewParagraphs],
      contentHtml: sanitizeRichHtml(input.contentHtml),
      quote: input.quote,
      quoteSource: input.quoteSource,
      glossary: input.glossary.map((g) => ({ ...g })),
      provider: this.name,
    };
  }
}

export async function translatePostToEnglish(
  input: TranslatablePostPayload
): Promise<{
  payload: TranslatedPostPayload;
  status: 'translated' | 'failed';
  errorMessage?: string;
}> {
  const fallback = new LocalFallbackTranslationProvider();

  if (GEMINI_API_KEY.trim()) {
    const gemini = new GeminiTranslationProvider(GEMINI_API_KEY.trim(), GEMINI_MODEL);
    try {
      const result = await gemini.translatePostToEnglish(input);
      return { payload: result, status: 'translated' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown AI translation error';
      console.warn('[CMS Translator] Gemini translation failed, using fallback:', message);
      const fbResult = await fallback.translatePostToEnglish(input);
      return { payload: fbResult, status: 'failed', errorMessage: message };
    }
  }

  const fbResult = await fallback.translatePostToEnglish(input);
  return { payload: fbResult, status: 'translated' };
}
