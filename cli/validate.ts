import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_COVER_IMAGE } from '../server/services/postsService.ts';
import { GlossaryItem } from '../src/types/index.ts';
import { estimateReadTime } from './markdown.ts';
import { ValidationIssue, ValidationReport } from './types.ts';

function stripHtmlToWords(html: string): string[] {
  const plain = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(' ') : [];
}

function isRemoteOrUploadedUrl(src: string): boolean {
  return /^(https?:\/\/|\/uploads\/|data:image\/)/i.test(src.trim());
}

export function validatePostPayload(
  payload: Record<string, unknown>,
  options?: { baseDir?: string; checkTranslation?: boolean }
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const title = String(payload.title || '').trim();
  const excerpt = String(payload.excerpt || '').trim();
  const slug = String(payload.slug || '').trim();
  const section = payload.section;
  const themeKey = payload.themeKey;
  const status = payload.status;
  const image = String(payload.image || '').trim();
  const imageAlt = String(payload.imageAlt || '').trim();
  const contentHtml = String(payload.contentHtml || '').trim();
  const quote = String(payload.quote || '').trim();
  const quoteSource = String(payload.quoteSource || '').trim();
  const glossary = Array.isArray(payload.glossary) ? (payload.glossary as GlossaryItem[]) : [];

  if (!title) {
    errors.push({
      field: 'title',
      level: 'error',
      message: 'Missing required field "title".',
      hint: 'Provide a concise Vietnamese editorial title.',
    });
  } else if (title.length < 8) {
    warnings.push({
      field: 'title',
      level: 'warning',
      message: `Title is very short (${title.length} chars).`,
      hint: 'Editorial titles typically read best at 20-80 characters.',
    });
  }

  if (!excerpt) {
    errors.push({
      field: 'excerpt',
      level: 'error',
      message: 'Missing required field "excerpt".',
      hint: 'Provide a 1-2 sentence teaser shown on cards and in SEO previews.',
    });
  } else if (excerpt.length > 280) {
    warnings.push({
      field: 'excerpt',
      level: 'warning',
      message: `Excerpt is quite long (${excerpt.length} chars).`,
      hint: 'Keep card excerpts under ~220 characters for clean layout.',
    });
  }

  if (section !== undefined && section !== 'bento' && section !== 'stories') {
    errors.push({
      field: 'section',
      level: 'error',
      message: `Invalid section "${String(section)}".`,
      hint: 'Allowed values: "bento" or "stories".',
    });
  }

  if (
    themeKey !== undefined &&
    themeKey !== 'coffee' &&
    themeKey !== 'culture' &&
    themeKey !== 'nature' &&
    themeKey !== 'cuisine'
  ) {
    errors.push({
      field: 'themeKey',
      level: 'error',
      message: `Invalid themeKey "${String(themeKey)}".`,
      hint: 'Allowed values: "coffee", "culture", "nature", "cuisine".',
    });
  }

  if (
    status !== undefined &&
    status !== 'draft' &&
    status !== 'in_review' &&
    status !== 'published'
  ) {
    errors.push({
      field: 'status',
      level: 'error',
      message: `Invalid status "${String(status)}".`,
      hint: 'Allowed values: "draft", "in_review", "published".',
    });
  }

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push({
      field: 'slug',
      level: 'error',
      message: `Invalid slug "${slug}".`,
      hint: 'Slug must use lowercase ASCII letters, numbers, and hyphens only (e.g. "ca-phe-buon-ma-thuot").',
    });
  }

  if (!image) {
    warnings.push({
      field: 'image',
      level: 'warning',
      message: 'No cover image specified; server default placeholder will be used.',
      hint: 'Set "image" to an HTTPS image URL, "/uploads/..." path, or local file with --upload-media.',
    });
  } else if (image === DEFAULT_COVER_IMAGE) {
    warnings.push({
      field: 'image',
      level: 'warning',
      message: 'Using default fallback cover image.',
      hint: 'Consider setting a topic-specific cover photo.',
    });
  } else if (!isRemoteOrUploadedUrl(image)) {
    const baseDir = options?.baseDir || process.cwd();
    const resolved = path.resolve(baseDir, image);
    if (!fs.existsSync(resolved)) {
      errors.push({
        field: 'image',
        level: 'error',
        message: `Local cover image path does not exist: "${image}".`,
        hint: 'Provide a valid local image path (with --upload-media) or an HTTPS / /uploads/ URL.',
      });
    } else {
      warnings.push({
        field: 'image',
        level: 'warning',
        message: `Cover image "${image}" is a local path.`,
        hint: 'Run with --upload-media to upload it to /uploads/... automatically.',
      });
    }
  }

  if (!imageAlt) {
    warnings.push({
      field: 'imageAlt',
      level: 'warning',
      message: 'Missing "imageAlt" accessibility description.',
      hint: 'Add a descriptive alt text for the cover image.',
    });
  }

  const wordsVi = stripHtmlToWords(contentHtml);
  const paragraphsVi = (contentHtml.match(/<p\b/gi) || []).length;
  const headingsVi = (contentHtml.match(/<h[1-4]\b/gi) || []).length;
  const imagesVi = (contentHtml.match(/<img\b/gi) || []).length;
  const linksVi = (contentHtml.match(/<a\b/gi) || []).length;

  if (!contentHtml || wordsVi.length === 0) {
    errors.push({
      field: 'contentHtml',
      level: 'error',
      message: 'Article body content is empty.',
      hint: 'Add Markdown body content or contentHtml.',
    });
  } else if (wordsVi.length < 80) {
    warnings.push({
      field: 'contentHtml',
      level: 'warning',
      message: `Article body is short (${wordsVi.length} words).`,
      hint: 'Rich travel stories usually have 200+ words with H2/H3 sections.',
    });
  }

  if (wordsVi.length >= 120 && headingsVi === 0) {
    warnings.push({
      field: 'contentHtml',
      level: 'warning',
      message: 'No headings (H2/H3) found in article body.',
      hint: 'Use "## Section Heading" in Markdown for better scannability.',
    });
  }

  if (!quote) {
    warnings.push({
      field: 'quote',
      level: 'warning',
      message: 'No editorial pull-quote specified.',
      hint: 'Adding a "quote" (and "quoteSource") enriches the article modal & blog page.',
    });
  } else if (!quoteSource) {
    warnings.push({
      field: 'quoteSource',
      level: 'warning',
      message: 'Quote provided without "quoteSource".',
    });
  }

  if (glossary.length === 0) {
    warnings.push({
      field: 'glossary',
      level: 'warning',
      message: 'No cultural/travel glossary items specified.',
      hint: 'Add 1-3 glossary entries (term + def) to help readers understand local terms.',
    });
  } else {
    glossary.forEach((g, idx) => {
      if (!String(g?.term || '').trim() || !String(g?.def || '').trim()) {
        errors.push({
          field: `glossary[${idx}]`,
          level: 'error',
          message: `Glossary entry #${idx + 1} is missing "term" or "def".`,
        });
      }
    });
  }

  // English translation readiness
  const titleEn = String(payload.titleEn || '').trim();
  const excerptEn = String(payload.excerptEn || '').trim();
  const contentHtmlEn = String(payload.contentHtmlEn || '').trim();
  const wordsEn = stripHtmlToWords(contentHtmlEn);
  const hasEnglishTranslation = Boolean(titleEn && excerptEn && wordsEn.length > 0 && titleEn !== title);

  if ((options?.checkTranslation || status === 'published') && !hasEnglishTranslation) {
    warnings.push({
      field: 'translation',
      level: 'warning',
      message: 'English translation is incomplete or appears identical to Vietnamese.',
      hint: 'Supply English translation via bilingual Markdown (<!-- LANG:EN -->) or "cms post translate".',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      wordsVi: wordsVi.length,
      wordsEn: wordsEn.length,
      paragraphsVi,
      headingsVi,
      imagesVi,
      linksVi,
      estimatedReadTimeVi: estimateReadTime(contentHtml, 'vi'),
      hasQuote: Boolean(quote),
      glossaryCount: glossary.length,
      hasEnglishTranslation,
    },
  };
}
