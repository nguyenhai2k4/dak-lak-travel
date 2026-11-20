import { getDb } from '../db/database.ts';
import {
  CmsPostAdmin,
  CmsPostPublic,
  CmsSectionType,
  GlossaryItem,
  Language,
  ThemeType,
  TranslationStatus,
} from '../../src/types/index.ts';
import { AuthUser } from './auth.ts';
import { ServiceError } from './errors.ts';
import {
  mapRowToAdminPost,
  mapRowToPublicPost,
  normalizeBentoMeta,
  normalizeStoryMeta,
  PostDbRow,
} from './postMapper.ts';
import { sanitizeRichHtml } from './sanitize.ts';
import { ensureUniqueSlug } from './slugify.ts';
import { translatePostToEnglish } from './translator.ts';

export const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80';

export function validateSection(val: unknown): CmsSectionType {
  return val === 'stories' ? 'stories' : 'bento';
}

export function validateTheme(val: unknown): ThemeType {
  if (val === 'culture' || val === 'nature' || val === 'cuisine') return val;
  return 'coffee';
}

export function sanitizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => String(item || '').trim()).filter(Boolean);
}

export function sanitizeGlossary(arr: unknown): GlossaryItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((g) => ({
      term: String((g as GlossaryItem)?.term || '').trim(),
      def: String((g as GlossaryItem)?.def || '').trim(),
    }))
    .filter((g) => g.term.length > 0 || g.def.length > 0);
}

export function derivePreviewParagraphs(
  previewInput: unknown,
  contentHtml: string,
  excerpt: string
): string[] {
  const cleaned = sanitizeStringArray(previewInput);
  if (cleaned.length > 0) return cleaned;

  const extracted = Array.from(contentHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gis))
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .slice(0, 2);

  if (extracted.length > 0) return extracted;
  return excerpt ? [excerpt] : [];
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function validateTranslationStatus(val: unknown): TranslationStatus | null {
  if (val === 'none' || val === 'pending' || val === 'translated' || val === 'failed') {
    return val;
  }
  return null;
}

function getPostRowWithAuthorById(id: number): PostDbRow | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.id = ?`
    )
    .get(id) as PostDbRow | undefined;
}

export async function runTranslationAndSave(postId: number): Promise<void> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as PostDbRow | undefined;
  if (!row) return;

  const previewParagraphs = safeJsonParse<string[]>(row.preview_paragraphs_json, []);
  const glossary = safeJsonParse<GlossaryItem[]>(row.glossary_json, []);

  const { payload, status } = await translatePostToEnglish({
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    location: row.location,
    readTime: row.read_time,
    cta: row.cta_label,
    previewParagraphs,
    contentHtml: row.content_html,
    quote: row.quote,
    quoteSource: row.quote_source,
    glossary,
  });

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE posts SET
      title_en = ?,
      excerpt_en = ?,
      category_en = ?,
      location_en = ?,
      read_time_en = ?,
      cta_label_en = ?,
      preview_paragraphs_en_json = ?,
      content_html_en = ?,
      quote_en = ?,
      quote_source_en = ?,
      glossary_en_json = ?,
      translation_status = ?,
      translation_provider = ?,
      translated_at = ?
     WHERE id = ?`
  ).run(
    payload.title,
    payload.excerpt,
    payload.category,
    payload.location,
    payload.readTime,
    payload.cta,
    JSON.stringify(payload.previewParagraphs),
    payload.contentHtml,
    payload.quote,
    payload.quoteSource,
    JSON.stringify(payload.glossary),
    status,
    payload.provider,
    now,
    postId
  );
}

export function listPublicPosts(lang: Language, section?: string): CmsPostPublic[] {
  const db = getDb();
  let sql = `
    SELECT p.*, u.display_name AS author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.status = 'published'
  `;
  const params: Array<string> = [];

  if (section === 'bento' || section === 'stories') {
    sql += ' AND p.section = ?';
    params.push(section);
  }

  sql += ' ORDER BY p.sort_order ASC, p.published_at DESC, p.id ASC';

  const rows = db.prepare(sql).all(...params) as unknown as PostDbRow[];
  return rows.map((row) => mapRowToPublicPost(row, lang));
}

export interface QueryRelevantPostsParams {
  lang: Language;
  themeKey?: ThemeType;
  locations?: string[];
  limit?: number;
}

/**
 * Dynamically filters and ranks published CMS stories/articles by theme and locations.
 */
export function queryRelevantPublishedPosts(params: QueryRelevantPostsParams): CmsPostPublic[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.status = 'published'
       ORDER BY (p.section = 'stories') DESC, p.sort_order ASC, p.published_at DESC, p.id ASC`
    )
    .all() as unknown as PostDbRow[];

  const posts = rows.map((row) => mapRowToPublicPost(row, params.lang));
  const limit = Math.max(1, Math.min(20, params.limit ?? 5));
  const cleanLocations = (params.locations || [])
    .map((loc) => String(loc || '').trim().toLowerCase())
    .filter((loc) => loc.length >= 2);

  if (!params.themeKey && cleanLocations.length === 0) {
    return posts.slice(0, limit);
  }

  const scored = posts.map((post, idx) => {
    let score = post.section === 'stories' ? 1 : 0;
    let matchedFilter = false;

    if (params.themeKey && post.themeKey === params.themeKey) {
      score += 10;
      matchedFilter = true;
    }

    const haystack = `${post.location} ${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
    for (const loc of cleanLocations) {
      if (haystack.includes(loc)) {
        score += 5;
        matchedFilter = true;
      }
    }

    return { post, score, matchedFilter, idx };
  });

  const matching = scored.filter((item) => item.matchedFilter);
  const pool = matching.length > 0 ? matching : scored;

  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });

  return pool.slice(0, limit).map((item) => item.post);
}

export function getPublicPostBySlug(
  slug: string,
  lang: Language,
  isPreview: boolean,
  authUser?: AuthUser
): { post: CmsPostPublic; related: CmsPostPublic[] } {
  const cleanedSlug = String(slug || '').trim();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.slug = ? OR p.legacy_key = ?
       LIMIT 1`
    )
    .get(cleanedSlug, cleanedSlug) as PostDbRow | undefined;

  if (!row) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  if (row.status !== 'published') {
    const canPreview =
      isPreview && authUser && (authUser.role === 'admin' || authUser.id === row.author_id);

    if (!canPreview) {
      throw new ServiceError(404, 'NOT_PUBLISHED', 'Bài viết chưa được xuất bản.');
    }
  }

  const relatedRows = db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.status = 'published' AND p.id != ?
       ORDER BY (p.section = ?) DESC, (p.theme_key = ?) DESC, p.sort_order ASC
       LIMIT 3`
    )
    .all(row.id, row.section, row.theme_key) as unknown as PostDbRow[];

  return {
    post: mapRowToPublicPost(row, lang),
    related: relatedRows.map((r) => mapRowToPublicPost(r, lang)),
  };
}

export function listAdminPosts(
  user: AuthUser,
  filters?: { section?: string; status?: string; q?: string; slug?: string }
): CmsPostAdmin[] {
  const db = getDb();
  const section = filters?.section;
  const status = filters?.status;
  const slug = String(filters?.slug || '').trim();
  const q = String(filters?.q || '').trim().toLowerCase();

  let sql = `
    SELECT p.*, u.display_name AS author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE 1=1
  `;
  const params: Array<string | number> = [];

  if (user.role === 'writer') {
    sql += ' AND p.author_id = ?';
    params.push(user.id);
  }

  if (section === 'bento' || section === 'stories') {
    sql += ' AND p.section = ?';
    params.push(section);
  }

  if (status === 'draft' || status === 'in_review' || status === 'published') {
    sql += ' AND p.status = ?';
    params.push(status);
  }

  if (slug) {
    sql += ' AND (p.slug = ? OR p.legacy_key = ?)';
    params.push(slug, slug);
  }

  if (q) {
    sql +=
      ' AND (LOWER(p.title) LIKE ? OR LOWER(p.location) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(p.slug) LIKE ?)';
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  sql += ' ORDER BY p.section ASC, p.sort_order ASC, p.updated_at DESC';

  const rows = db.prepare(sql).all(...params) as unknown as PostDbRow[];
  return rows.map(mapRowToAdminPost);
}

export function getAdminPostById(user: AuthUser, id: number): CmsPostAdmin {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const row = getPostRowWithAuthorById(id);
  if (!row) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  if (user.role === 'writer' && row.author_id !== user.id) {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Bạn chỉ có thể xem và chỉnh sửa bài viết của chính mình.'
    );
  }

  return mapRowToAdminPost(row);
}

export function getAdminPostByIdOrSlug(user: AuthUser, idOrSlug: string | number): CmsPostAdmin {
  const raw = String(idOrSlug).trim();
  if (/^\d+$/.test(raw)) {
    return getAdminPostById(user, Number(raw));
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.slug = ? OR p.legacy_key = ?
       LIMIT 1`
    )
    .get(raw, raw) as PostDbRow | undefined;

  if (!row) {
    throw new ServiceError(404, 'NOT_FOUND', `Không tìm thấy bài viết "${raw}".`);
  }

  if (user.role === 'writer' && row.author_id !== user.id) {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Bạn chỉ có thể xem và chỉnh sửa bài viết của chính mình.'
    );
  }

  return mapRowToAdminPost(row);
}

export async function createAdminPost(
  user: AuthUser,
  body: Record<string, unknown>
): Promise<CmsPostAdmin> {
  const title = String(body.title || '').trim();
  const excerpt = String(body.excerpt || '').trim();
  if (!title || !excerpt) {
    throw new ServiceError(
      400,
      'VALIDATION_ERROR',
      'Tiêu đề và mô tả ngắn (excerpt) là bắt buộc.'
    );
  }

  const section = validateSection(body.section);
  const themeKey = validateTheme(body.themeKey);
  const slug = ensureUniqueSlug(String(body.slug || title));
  const contentHtml = sanitizeRichHtml(String(body.contentHtml || ''));
  const previewParagraphs = derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt);
  const glossary = sanitizeGlossary(body.glossary);

  const sectionMeta =
    section === 'bento'
      ? normalizeBentoMeta(body.bentoConfig as Record<string, unknown> | undefined)
      : normalizeStoryMeta(body.storyConfig as Record<string, unknown> | undefined);

  const db = getDb();
  const maxOrderRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM posts WHERE section = ?')
    .get(section) as { maxOrder: number };

  const requestedStatus = body.status;
  const finalStatus =
    user.role === 'admin' && requestedStatus === 'published'
      ? 'published'
      : requestedStatus === 'in_review'
        ? 'in_review'
        : 'draft';

  const now = new Date().toISOString();
  const publishedAt = finalStatus === 'published' ? now : null;

  // Admin can optionally provide English fields at creation time (e.g. from AI agent bilingual draft)
  const hasExplicitEn =
    user.role === 'admin' &&
    (Boolean(String(body.titleEn || '').trim()) ||
      Boolean(String(body.contentHtmlEn || '').trim()));

  const enTitle = user.role === 'admin' && body.titleEn !== undefined ? String(body.titleEn) : '';
  const enExcerpt =
    user.role === 'admin' && body.excerptEn !== undefined ? String(body.excerptEn) : '';
  const enCategory =
    user.role === 'admin' && body.categoryEn !== undefined ? String(body.categoryEn) : '';
  const enLocation =
    user.role === 'admin' && body.locationEn !== undefined ? String(body.locationEn) : '';
  const enReadTime =
    user.role === 'admin' && body.readTimeEn !== undefined ? String(body.readTimeEn) : '';
  const enCta = user.role === 'admin' && body.ctaEn !== undefined ? String(body.ctaEn) : '';
  const enPreviewParagraphs =
    user.role === 'admin' && body.previewParagraphsEn !== undefined
      ? JSON.stringify(sanitizeStringArray(body.previewParagraphsEn))
      : '[]';
  const enContentHtml =
    user.role === 'admin' && body.contentHtmlEn !== undefined
      ? sanitizeRichHtml(String(body.contentHtmlEn))
      : '';
  const enQuote = user.role === 'admin' && body.quoteEn !== undefined ? String(body.quoteEn) : '';
  const enQuoteSource =
    user.role === 'admin' && body.quoteSourceEn !== undefined ? String(body.quoteSourceEn) : '';
  const enGlossary =
    user.role === 'admin' && body.glossaryEn !== undefined
      ? JSON.stringify(sanitizeGlossary(body.glossaryEn))
      : '[]';

  const explicitStatus = validateTranslationStatus(body.translationStatus);
  const translationStatus: TranslationStatus = hasExplicitEn
    ? explicitStatus || 'translated'
    : 'none';
  const translationProvider = hasExplicitEn
    ? String(body.translationProvider || 'ai-agent').trim()
    : '';
  const translatedAt = hasExplicitEn ? now : null;

  const result = db
    .prepare(
      `INSERT INTO posts (
        slug, legacy_key, section, status, sort_order, author_id, reviewed_by, review_note,
        cover_image, image_alt, theme_key, section_meta_json,
        title, excerpt, category, location, read_time, cta_label,
        preview_paragraphs_json, content_html, quote, quote_source, glossary_json,
        title_en, excerpt_en, category_en, location_en, read_time_en, cta_label_en,
        preview_paragraphs_en_json, content_html_en, quote_en, quote_source_en, glossary_en_json,
        translation_status, translation_provider, translated_at,
        published_at, created_at, updated_at
      ) VALUES (
        ?, NULL, ?, ?, ?, ?, ?, '',
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )`
    )
    .run(
      slug,
      section,
      finalStatus,
      maxOrderRow.maxOrder + 1,
      user.id,
      finalStatus === 'published' ? user.id : null,
      String(body.image || '').trim() || DEFAULT_COVER_IMAGE,
      String(body.imageAlt || title).trim(),
      themeKey,
      JSON.stringify(sectionMeta),
      title,
      excerpt,
      String(body.category || 'Khám phá Đắk Lắk').trim(),
      String(body.location || 'Đắk Lắk').trim(),
      String(body.readTime || '5 phút đọc').trim(),
      String(body.cta || 'Đọc câu chuyện').trim(),
      JSON.stringify(previewParagraphs),
      contentHtml || `<p>${excerpt}</p>`,
      String(body.quote || '').trim(),
      String(body.quoteSource || '').trim(),
      JSON.stringify(glossary),
      enTitle,
      enExcerpt,
      enCategory,
      enLocation,
      enReadTime,
      enCta,
      enPreviewParagraphs,
      enContentHtml,
      enQuote,
      enQuoteSource,
      enGlossary,
      translationStatus,
      translationProvider,
      translatedAt,
      publishedAt,
      now,
      now
    );

  const createdId = Number(result.lastInsertRowid);
  if (finalStatus === 'published' && (!hasExplicitEn || Boolean(body.retranslateOnSave))) {
    await runTranslationAndSave(createdId);
  }

  const createdRow = getPostRowWithAuthorById(createdId)!;
  return mapRowToAdminPost(createdRow);
}

export async function updateAdminPost(
  user: AuthUser,
  id: number,
  body: Record<string, unknown>
): Promise<CmsPostAdmin> {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  if (user.role === 'writer') {
    if (existing.author_id !== user.id) {
      throw new ServiceError(
        403,
        'FORBIDDEN',
        'Bạn chỉ có thể chỉnh sửa bài viết của chính mình.'
      );
    }
    if (existing.status === 'published') {
      throw new ServiceError(
        403,
        'FORBIDDEN',
        'Bài viết đã xuất bản chỉ có thể được chỉnh sửa bởi Quản trị viên (Admin).'
      );
    }
  }

  const title = String(body.title ?? existing.title).trim();
  const excerpt = String(body.excerpt ?? existing.excerpt).trim();
  if (!title || !excerpt) {
    throw new ServiceError(
      400,
      'VALIDATION_ERROR',
      'Tiêu đề và mô tả ngắn (excerpt) không được để trống.'
    );
  }

  const section = body.section ? validateSection(body.section) : existing.section;
  const themeKey = body.themeKey ? validateTheme(body.themeKey) : existing.theme_key;
  const slug = body.slug ? ensureUniqueSlug(String(body.slug), id) : existing.slug;
  const contentHtml =
    body.contentHtml !== undefined ? sanitizeRichHtml(String(body.contentHtml)) : existing.content_html;
  const previewParagraphs =
    body.previewParagraphs !== undefined
      ? derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt)
      : safeJsonParse<string[]>(existing.preview_paragraphs_json, []);
  const glossary =
    body.glossary !== undefined
      ? sanitizeGlossary(body.glossary)
      : safeJsonParse<GlossaryItem[]>(existing.glossary_json, []);

  const sectionMeta =
    section === 'bento'
      ? normalizeBentoMeta(
          (body.bentoConfig as Record<string, unknown> | undefined) ??
            safeJsonParse<Record<string, unknown>>(existing.section_meta_json, {})
        )
      : normalizeStoryMeta(
          (body.storyConfig as Record<string, unknown> | undefined) ??
            safeJsonParse<Record<string, unknown>>(existing.section_meta_json, {})
        );

  let nextStatus = existing.status;
  if (user.role === 'writer') {
    if (body.status === 'draft' || body.status === 'in_review') {
      nextStatus = body.status;
    }
  } else if (
    body.status === 'draft' ||
    body.status === 'in_review' ||
    body.status === 'published'
  ) {
    nextStatus = body.status;
  }

  const now = new Date().toISOString();
  const publishedAt =
    nextStatus === 'published' ? existing.published_at || now : existing.published_at;

  const isAdmin = user.role === 'admin';
  const enTitle = isAdmin && body.titleEn !== undefined ? String(body.titleEn) : existing.title_en;
  const enExcerpt =
    isAdmin && body.excerptEn !== undefined ? String(body.excerptEn) : existing.excerpt_en;
  const enCategory =
    isAdmin && body.categoryEn !== undefined ? String(body.categoryEn) : existing.category_en;
  const enLocation =
    isAdmin && body.locationEn !== undefined ? String(body.locationEn) : existing.location_en;
  const enReadTime =
    isAdmin && body.readTimeEn !== undefined ? String(body.readTimeEn) : existing.read_time_en;
  const enCta = isAdmin && body.ctaEn !== undefined ? String(body.ctaEn) : existing.cta_label_en;
  const enPreviewParagraphs =
    isAdmin && body.previewParagraphsEn !== undefined
      ? JSON.stringify(sanitizeStringArray(body.previewParagraphsEn))
      : existing.preview_paragraphs_en_json;
  const enContentHtml =
    isAdmin && body.contentHtmlEn !== undefined
      ? sanitizeRichHtml(String(body.contentHtmlEn))
      : existing.content_html_en;
  const enQuote = isAdmin && body.quoteEn !== undefined ? String(body.quoteEn) : existing.quote_en;
  const enQuoteSource =
    isAdmin && body.quoteSourceEn !== undefined
      ? String(body.quoteSourceEn)
      : existing.quote_source_en;
  const enGlossary =
    isAdmin && body.glossaryEn !== undefined
      ? JSON.stringify(sanitizeGlossary(body.glossaryEn))
      : existing.glossary_en_json;

  const enFieldsSubmitted =
    isAdmin &&
    [
      'titleEn',
      'excerptEn',
      'categoryEn',
      'locationEn',
      'readTimeEn',
      'ctaEn',
      'previewParagraphsEn',
      'contentHtmlEn',
      'quoteEn',
      'quoteSourceEn',
      'glossaryEn',
    ].some((k) => body[k] !== undefined);

  const explicitTranslationStatus = isAdmin ? validateTranslationStatus(body.translationStatus) : null;
  const nextTranslationStatus =
    explicitTranslationStatus ??
    (enFieldsSubmitted && (enTitle.trim() || enContentHtml.trim())
      ? 'translated'
      : existing.translation_status);
  const nextTranslationProvider =
    isAdmin && body.translationProvider !== undefined
      ? String(body.translationProvider).trim()
      : existing.translation_provider;
  const nextTranslatedAt =
    enFieldsSubmitted && (enTitle.trim() || enContentHtml.trim())
      ? now
      : existing.translated_at;

  db.prepare(
    `UPDATE posts SET
      slug = ?, section = ?, status = ?, cover_image = ?, image_alt = ?, theme_key = ?, section_meta_json = ?,
      title = ?, excerpt = ?, category = ?, location = ?, read_time = ?, cta_label = ?,
      preview_paragraphs_json = ?, content_html = ?, quote = ?, quote_source = ?, glossary_json = ?,
      title_en = ?, excerpt_en = ?, category_en = ?, location_en = ?, read_time_en = ?, cta_label_en = ?,
      preview_paragraphs_en_json = ?, content_html_en = ?, quote_en = ?, quote_source_en = ?, glossary_en_json = ?,
      translation_status = ?, translation_provider = ?, translated_at = ?,
      published_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    slug,
    section,
    nextStatus,
    String(body.image ?? existing.cover_image).trim(),
    String(body.imageAlt ?? existing.image_alt).trim(),
    themeKey,
    JSON.stringify(sectionMeta),
    title,
    excerpt,
    String(body.category ?? existing.category).trim(),
    String(body.location ?? existing.location).trim(),
    String(body.readTime ?? existing.read_time).trim(),
    String(body.cta ?? existing.cta_label).trim(),
    JSON.stringify(previewParagraphs),
    contentHtml,
    String(body.quote ?? existing.quote).trim(),
    String(body.quoteSource ?? existing.quote_source).trim(),
    JSON.stringify(glossary),
    enTitle,
    enExcerpt,
    enCategory,
    enLocation,
    enReadTime,
    enCta,
    enPreviewParagraphs,
    enContentHtml,
    enQuote,
    enQuoteSource,
    enGlossary,
    nextTranslationStatus,
    nextTranslationProvider,
    nextTranslatedAt,
    publishedAt,
    now,
    id
  );

  const hasCustomEnTranslation = Boolean(enTitle.trim() && enContentHtml.trim());
  const shouldAutoTranslate =
    Boolean(body.retranslateOnSave) ||
    (nextStatus === 'published' && existing.status !== 'published' && !hasCustomEnTranslation);

  if (shouldAutoTranslate) {
    await runTranslationAndSave(id);
  }

  return mapRowToAdminPost(getPostRowWithAuthorById(id)!);
}

export function submitAdminPost(user: AuthUser, id: number): CmsPostAdmin {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }
  if (user.role === 'writer' && existing.author_id !== user.id) {
    throw new ServiceError(403, 'FORBIDDEN', 'Bạn chỉ có thể gửi duyệt bài viết của chính mình.');
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE posts SET status = 'in_review', review_note = '', updated_at = ? WHERE id = ?").run(
    now,
    id
  );

  return mapRowToAdminPost(getPostRowWithAuthorById(id)!);
}

export async function reviewAdminPost(
  admin: AuthUser,
  id: number,
  action: string,
  reviewNote = ''
): Promise<CmsPostAdmin> {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }
  if (!['publish', 'return_draft', 'unpublish'].includes(action)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Hành động duyệt không hợp lệ.');
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  const now = new Date().toISOString();
  const cleanedNote = reviewNote.trim();

  if (action === 'publish') {
    db.prepare(
      `UPDATE posts
       SET status = 'published', reviewed_by = ?, review_note = '', published_at = COALESCE(published_at, ?), updated_at = ?
       WHERE id = ?`
    ).run(admin.id, now, now, id);

    // Preserve existing curated/AI-agent translation if present, unless status is not translated
    const alreadyTranslatedByAgent =
      existing.translation_status === 'translated' &&
      Boolean(existing.title_en.trim()) &&
      Boolean(existing.content_html_en.trim()) &&
      existing.translation_provider !== 'local-fallback';

    if (!alreadyTranslatedByAgent) {
      await runTranslationAndSave(id);
    }
  } else {
    db.prepare(
      `UPDATE posts
       SET status = 'draft', reviewed_by = ?, review_note = ?, updated_at = ?
       WHERE id = ?`
    ).run(admin.id, cleanedNote, now, id);
  }

  return mapRowToAdminPost(getPostRowWithAuthorById(id)!);
}

export async function retranslateAdminPost(admin: AuthUser, id: number): Promise<CmsPostAdmin> {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(id) as { id: number } | undefined;
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  await runTranslationAndSave(id);
  return mapRowToAdminPost(getPostRowWithAuthorById(id)!);
}

export async function saveCustomTranslation(
  user: AuthUser,
  id: number,
  body: Record<string, unknown>
): Promise<CmsPostAdmin> {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  if (user.role === 'writer') {
    if (existing.author_id !== user.id) {
      throw new ServiceError(403, 'FORBIDDEN', 'Bạn chỉ có thể dịch bài viết của chính mình.');
    }
    if (existing.status === 'published') {
      throw new ServiceError(
        403,
        'FORBIDDEN',
        'Bài viết đã xuất bản chỉ có thể được cập nhật bản dịch bởi Quản trị viên (Admin).'
      );
    }
  }

  const titleEn = String(body.titleEn ?? body.title ?? existing.title_en).trim();
  const excerptEn = String(body.excerptEn ?? body.excerpt ?? existing.excerpt_en).trim();
  const categoryEn = String(body.categoryEn ?? body.category ?? existing.category_en).trim();
  const locationEn = String(body.locationEn ?? body.location ?? existing.location_en).trim();
  const readTimeEn = String(body.readTimeEn ?? body.readTime ?? existing.read_time_en).trim();
  const ctaEn = String(body.ctaEn ?? body.cta ?? existing.cta_label_en).trim();

  const rawHtml = body.contentHtmlEn ?? body.contentHtml;
  const contentHtmlEn =
    rawHtml !== undefined ? sanitizeRichHtml(String(rawHtml)) : existing.content_html_en;

  const rawPreview = body.previewParagraphsEn ?? body.previewParagraphs;
  const previewParagraphsEn =
    rawPreview !== undefined
      ? derivePreviewParagraphs(rawPreview, contentHtmlEn, excerptEn)
      : safeJsonParse<string[]>(existing.preview_paragraphs_en_json, []);

  const quoteEn = String(body.quoteEn ?? body.quote ?? existing.quote_en).trim();
  const quoteSourceEn = String(
    body.quoteSourceEn ?? body.quoteSource ?? existing.quote_source_en
  ).trim();

  const rawGlossary = body.glossaryEn ?? body.glossary;
  const glossaryEn =
    rawGlossary !== undefined
      ? sanitizeGlossary(rawGlossary)
      : safeJsonParse<GlossaryItem[]>(existing.glossary_en_json, []);

  if (!titleEn || !excerptEn) {
    throw new ServiceError(
      400,
      'VALIDATION_ERROR',
      'Bản dịch tiếng Anh cần có tối thiểu titleEn và excerptEn.'
    );
  }

  const provider = String(body.provider || body.translationProvider || 'ai-agent').trim();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE posts SET
      title_en = ?, excerpt_en = ?, category_en = ?, location_en = ?, read_time_en = ?, cta_label_en = ?,
      preview_paragraphs_en_json = ?, content_html_en = ?, quote_en = ?, quote_source_en = ?, glossary_en_json = ?,
      translation_status = 'translated', translation_provider = ?, translated_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    titleEn,
    excerptEn,
    categoryEn,
    locationEn,
    readTimeEn,
    ctaEn,
    JSON.stringify(previewParagraphsEn),
    contentHtmlEn,
    quoteEn,
    quoteSourceEn,
    JSON.stringify(glossaryEn),
    provider,
    now,
    now,
    id
  );

  return mapRowToAdminPost(getPostRowWithAuthorById(id)!);
}

export function reorderAdminPosts(
  admin: AuthUser,
  sectionInput: unknown,
  orderedIdsInput: unknown
): void {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }

  const section = validateSection(sectionInput);
  const orderedIds = Array.isArray(orderedIdsInput)
    ? orderedIdsInput.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n))
    : [];

  if (orderedIds.length === 0) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Danh sách ID sắp xếp không hợp lệ.');
  }

  const db = getDb();
  const stmt = db.prepare('UPDATE posts SET sort_order = ? WHERE id = ? AND section = ?');
  db.exec('BEGIN');
  try {
    orderedIds.forEach((postId: number, idx: number) => {
      stmt.run(idx, postId, section);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function deleteAdminPost(user: AuthUser, id: number): void {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;

  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  if (user.role === 'writer') {
    if (existing.author_id !== user.id) {
      throw new ServiceError(403, 'FORBIDDEN', 'Bạn chỉ có thể xóa bài viết của chính mình.');
    }
    if (existing.status !== 'draft') {
      throw new ServiceError(
        403,
        'FORBIDDEN',
        'Tác giả chỉ có thể xóa bài viết ở trạng thái Bản nháp.'
      );
    }
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

export function getCmsStatsAndContext(sectionFilter?: string): {
  counts: {
    total: number;
    byStatus: Record<'draft' | 'in_review' | 'published', number>;
    bySection: Record<'bento' | 'stories', number>;
  };
  categories: string[];
  locations: string[];
  existingPosts: Array<{
    id: number;
    slug: string;
    section: CmsSectionType;
    status: string;
    themeKey: ThemeType;
    title: string;
    category: string;
    location: string;
    translationStatus: TranslationStatus;
  }>;
} {
  const db = getDb();
  let sql =
    'SELECT id, slug, section, status, theme_key, title, category, location, translation_status FROM posts';
  const params: string[] = [];
  if (sectionFilter === 'bento' || sectionFilter === 'stories') {
    sql += ' WHERE section = ?';
    params.push(sectionFilter);
  }
  sql += ' ORDER BY section ASC, sort_order ASC, id ASC';

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    slug: string;
    section: CmsSectionType;
    status: 'draft' | 'in_review' | 'published';
    theme_key: ThemeType;
    title: string;
    category: string;
    location: string;
    translation_status: TranslationStatus;
  }>;

  const byStatus = { draft: 0, in_review: 0, published: 0 };
  const bySection = { bento: 0, stories: 0 };
  const catSet = new Set<string>();
  const locSet = new Set<string>();

  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status] += 1;
    if (r.section in bySection) bySection[r.section] += 1;
    if (r.category) catSet.add(r.category);
    if (r.location) locSet.add(r.location);
  }

  return {
    counts: {
      total: rows.length,
      byStatus,
      bySection,
    },
    categories: Array.from(catSet),
    locations: Array.from(locSet),
    existingPosts: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      section: r.section,
      status: r.status,
      themeKey: r.theme_key,
      title: r.title,
      category: r.category,
      location: r.location,
      translationStatus: r.translation_status,
    })),
  };
}
