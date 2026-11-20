import { getDb, isUsingSupabase } from '../../db/database.ts';
import { getSupabaseAdmin } from '../../db/supabaseClient.ts';
import {
  type CmsPostAdmin,
  type CmsPostPublic,
  type CmsSectionType,
  type GlossaryItem,
  type Language,
  type ThemeType,
  type TranslationStatus,
} from '../../../src/types/index.ts';
import { type AuthUser } from '../core/auth.ts';
import { ServiceError } from '../core/errors.ts';
import {
  mapRowToAdminPost,
  mapRowToPublicPost,
  normalizeBentoMeta,
  normalizeStoryMeta,
  type PostDbRow,
  safeJsonValue,
} from './postMapper.ts';
import { sanitizeRichHtml } from '../core/sanitize.ts';
import { ensureUniqueSlug } from '../core/slugify.ts';
import { translatePostToEnglish } from '../ai/translator.ts';

export const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80';

const SUPABASE_POST_SELECT = '*, author:users!posts_author_id_fkey(display_name)';

function normalizeSupabasePostRow(raw: Record<string, unknown>): PostDbRow {
  const authorObj = Array.isArray(raw.author) ? raw.author[0] : raw.author;
  const authorName =
    authorObj && typeof authorObj === 'object' && 'display_name' in authorObj
      ? String((authorObj as { display_name?: string | null }).display_name || '') || null
      : null;

  const { author: _ignored, ...rest } = raw;
  return {
    ...(rest as unknown as PostDbRow),
    id: Number(rest.id),
    author_id: rest.author_id !== null && rest.author_id !== undefined ? Number(rest.author_id) : null,
    reviewed_by:
      rest.reviewed_by !== null && rest.reviewed_by !== undefined ? Number(rest.reviewed_by) : null,
    author_name: authorName,
  };
}

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

function validateTranslationStatus(val: unknown): TranslationStatus | null {
  if (val === 'none' || val === 'pending' || val === 'translated' || val === 'failed') {
    return val;
  }
  return null;
}

async function getPostRowWithAuthorById(id: number): Promise<PostDbRow | undefined> {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('posts')
      .select(SUPABASE_POST_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Supabase getPostRowWithAuthorById failed: ${error.message}`);
    return data ? normalizeSupabasePostRow(data as Record<string, unknown>) : undefined;
  }

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

async function getRawPostById(id: number): Promise<PostDbRow | undefined> {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase getRawPostById failed: ${error.message}`);
    return data ? normalizeSupabasePostRow(data as Record<string, unknown>) : undefined;
  }

  const db = getDb();
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
}

async function findPostRowWithAuthorBySlugOrLegacyKey(
  cleanedSlug: string
): Promise<PostDbRow | undefined> {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: bySlug, error: slugErr } = await supabase
      .from('posts')
      .select(SUPABASE_POST_SELECT)
      .eq('slug', cleanedSlug)
      .limit(1)
      .maybeSingle();
    if (slugErr) throw new Error(`Supabase post lookup by slug failed: ${slugErr.message}`);
    if (bySlug) return normalizeSupabasePostRow(bySlug as Record<string, unknown>);

    const { data: byLegacy, error: legacyErr } = await supabase
      .from('posts')
      .select(SUPABASE_POST_SELECT)
      .eq('legacy_key', cleanedSlug)
      .limit(1)
      .maybeSingle();
    if (legacyErr) throw new Error(`Supabase post lookup by legacy_key failed: ${legacyErr.message}`);
    return byLegacy ? normalizeSupabasePostRow(byLegacy as Record<string, unknown>) : undefined;
  }

  const db = getDb();
  return db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.slug = ? OR p.legacy_key = ?
       LIMIT 1`
    )
    .get(cleanedSlug, cleanedSlug) as PostDbRow | undefined;
}

export async function runTranslationAndSave(postId: number): Promise<void> {
  const row = await getRawPostById(postId);
  if (!row) return;

  const previewParagraphs = safeJsonValue<string[]>(row.preview_paragraphs_json, []);
  const glossary = safeJsonValue<GlossaryItem[]>(row.glossary_json, []);

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

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('posts')
      .update({
        title_en: payload.title,
        excerpt_en: payload.excerpt,
        category_en: payload.category,
        location_en: payload.location,
        read_time_en: payload.readTime,
        cta_label_en: payload.cta,
        preview_paragraphs_en_json: payload.previewParagraphs,
        content_html_en: payload.contentHtml,
        quote_en: payload.quote,
        quote_source_en: payload.quoteSource,
        glossary_en_json: payload.glossary,
        translation_status: status,
        translation_provider: payload.provider,
        translated_at: now,
      })
      .eq('id', postId);
    if (error) throw new Error(`Supabase save translation failed: ${error.message}`);
    return;
  }

  const db = getDb();
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

export async function listPublicPosts(lang: Language, section?: string): Promise<CmsPostPublic[]> {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('posts')
      .select(SUPABASE_POST_SELECT)
      .eq('status', 'published');

    if (section === 'bento' || section === 'stories') {
      query = query.eq('section', section);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })
      .order('id', { ascending: true });
    if (error) throw new Error(`Supabase listPublicPosts failed: ${error.message}`);

    return ((data || []) as Record<string, unknown>[]).map((r) =>
      mapRowToPublicPost(normalizeSupabasePostRow(r), lang)
    );
  }

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
export async function queryRelevantPublishedPosts(
  params: QueryRelevantPostsParams
): Promise<CmsPostPublic[]> {
  let rows: PostDbRow[];
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('posts')
      .select(SUPABASE_POST_SELECT)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })
      .order('id', { ascending: true });
    if (error) throw new Error(`Supabase queryRelevantPublishedPosts failed: ${error.message}`);
    rows = ((data || []) as Record<string, unknown>[]).map(normalizeSupabasePostRow);
    // Prioritize stories before bento, matching SQLite ORDER BY (p.section = 'stories') DESC
    rows.sort((a, b) => {
      const aStory = a.section === 'stories' ? 1 : 0;
      const bStory = b.section === 'stories' ? 1 : 0;
      if (bStory !== aStory) return bStory - aStory;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aPub = a.published_at || '';
      const bPub = b.published_at || '';
      if (bPub !== aPub) return bPub.localeCompare(aPub);
      return a.id - b.id;
    });
  } else {
    const db = getDb();
    rows = db
      .prepare(
        `SELECT p.*, u.display_name AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published'
         ORDER BY (p.section = 'stories') DESC, p.sort_order ASC, p.published_at DESC, p.id ASC`
      )
      .all() as unknown as PostDbRow[];
  }

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

export async function getPublicPostBySlug(
  slug: string,
  lang: Language,
  isPreview: boolean,
  authUser?: AuthUser
): Promise<{ post: CmsPostPublic; related: CmsPostPublic[] }> {
  const cleanedSlug = String(slug || '').trim();
  const row = await findPostRowWithAuthorBySlugOrLegacyKey(cleanedSlug);

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

  let relatedRows: PostDbRow[];
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('posts')
      .select(SUPABASE_POST_SELECT)
      .eq('status', 'published')
      .neq('id', row.id)
      .order('sort_order', { ascending: true });
    if (error) throw new Error(`Supabase related posts query failed: ${error.message}`);
    relatedRows = ((data || []) as Record<string, unknown>[]).map(normalizeSupabasePostRow);
    relatedRows.sort((a, b) => {
      const aSec = a.section === row.section ? 1 : 0;
      const bSec = b.section === row.section ? 1 : 0;
      if (bSec !== aSec) return bSec - aSec;
      const aTheme = a.theme_key === row.theme_key ? 1 : 0;
      const bTheme = b.theme_key === row.theme_key ? 1 : 0;
      if (bTheme !== aTheme) return bTheme - aTheme;
      return a.sort_order - b.sort_order;
    });
    relatedRows = relatedRows.slice(0, 3);
  } else {
    const db = getDb();
    relatedRows = db
      .prepare(
        `SELECT p.*, u.display_name AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published' AND p.id != ?
         ORDER BY (p.section = ?) DESC, (p.theme_key = ?) DESC, p.sort_order ASC
         LIMIT 3`
      )
      .all(row.id, row.section, row.theme_key) as unknown as PostDbRow[];
  }

  return {
    post: mapRowToPublicPost(row, lang),
    related: relatedRows.map((r) => mapRowToPublicPost(r, lang)),
  };
}

export async function listAdminPosts(
  user: AuthUser,
  filters?: { section?: string; status?: string; q?: string; slug?: string }
): Promise<CmsPostAdmin[]> {
  const section = filters?.section;
  const status = filters?.status;
  const slug = String(filters?.slug || '').trim();
  const q = String(filters?.q || '').trim().toLowerCase();

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('posts').select(SUPABASE_POST_SELECT);

    if (user.role === 'writer') {
      query = query.eq('author_id', user.id);
    }
    if (section === 'bento' || section === 'stories') {
      query = query.eq('section', section);
    }
    if (status === 'draft' || status === 'in_review' || status === 'published') {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Supabase listAdminPosts failed: ${error.message}`);

    let rows = ((data || []) as Record<string, unknown>[]).map(normalizeSupabasePostRow);
    if (slug) {
      rows = rows.filter((r) => r.slug === slug || r.legacy_key === slug);
    }
    if (q) {
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q)
      );
    }
    return rows.map(mapRowToAdminPost);
  }

  const db = getDb();
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

export async function getAdminPostById(user: AuthUser, id: number): Promise<CmsPostAdmin> {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const row = await getPostRowWithAuthorById(id);
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

export async function getAdminPostByIdOrSlug(
  user: AuthUser,
  idOrSlug: string | number
): Promise<CmsPostAdmin> {
  const raw = String(idOrSlug).trim();
  if (/^\d+$/.test(raw)) {
    return getAdminPostById(user, Number(raw));
  }

  const row = await findPostRowWithAuthorBySlugOrLegacyKey(raw);

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
  const slug = await ensureUniqueSlug(String(body.slug || title));
  const contentHtml = sanitizeRichHtml(String(body.contentHtml || ''));
  const previewParagraphs = derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt);
  const glossary = sanitizeGlossary(body.glossary);

  const sectionMeta =
    section === 'bento'
      ? normalizeBentoMeta(body.bentoConfig as Record<string, unknown> | undefined)
      : normalizeStoryMeta(body.storyConfig as Record<string, unknown> | undefined);

  const requestedStatus = body.status;
  const finalStatus =
    user.role === 'admin' && requestedStatus === 'published'
      ? 'published'
      : requestedStatus === 'in_review'
        ? 'in_review'
        : 'draft';

  const now = new Date().toISOString();
  const publishedAt = finalStatus === 'published' ? now : null;

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
  const enPreviewParagraphsArr =
    user.role === 'admin' && body.previewParagraphsEn !== undefined
      ? sanitizeStringArray(body.previewParagraphsEn)
      : [];
  const enContentHtml =
    user.role === 'admin' && body.contentHtmlEn !== undefined
      ? sanitizeRichHtml(String(body.contentHtmlEn))
      : '';
  const enQuote = user.role === 'admin' && body.quoteEn !== undefined ? String(body.quoteEn) : '';
  const enQuoteSource =
    user.role === 'admin' && body.quoteSourceEn !== undefined ? String(body.quoteSourceEn) : '';
  const enGlossaryArr =
    user.role === 'admin' && body.glossaryEn !== undefined
      ? sanitizeGlossary(body.glossaryEn)
      : [];

  const explicitStatus = validateTranslationStatus(body.translationStatus);
  const translationStatus: TranslationStatus = hasExplicitEn
    ? explicitStatus || 'translated'
    : 'none';
  const translationProvider = hasExplicitEn
    ? String(body.translationProvider || 'ai-agent').trim()
    : '';
  const translatedAt = hasExplicitEn ? now : null;

  let createdId: number;

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: maxRow } = await supabase
      .from('posts')
      .select('sort_order')
      .eq('section', section)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const maxOrder = maxRow?.sort_order !== undefined ? Number(maxRow.sort_order) : -1;

    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        slug,
        legacy_key: null,
        section,
        status: finalStatus,
        sort_order: maxOrder + 1,
        author_id: user.id,
        reviewed_by: finalStatus === 'published' ? user.id : null,
        review_note: '',
        cover_image: String(body.image || '').trim() || DEFAULT_COVER_IMAGE,
        image_alt: String(body.imageAlt || title).trim(),
        theme_key: themeKey,
        section_meta_json: sectionMeta,
        title,
        excerpt,
        category: String(body.category || 'Khám phá Đắk Lắk').trim(),
        location: String(body.location || 'Đắk Lắk').trim(),
        read_time: String(body.readTime || '5 phút đọc').trim(),
        cta_label: String(body.cta || 'Đọc câu chuyện').trim(),
        preview_paragraphs_json: previewParagraphs,
        content_html: contentHtml || `<p>${excerpt}</p>`,
        quote: String(body.quote || '').trim(),
        quote_source: String(body.quoteSource || '').trim(),
        glossary_json: glossary,
        title_en: enTitle,
        excerpt_en: enExcerpt,
        category_en: enCategory,
        location_en: enLocation,
        read_time_en: enReadTime,
        cta_label_en: enCta,
        preview_paragraphs_en_json: enPreviewParagraphsArr,
        content_html_en: enContentHtml,
        quote_en: enQuote,
        quote_source_en: enQuoteSource,
        glossary_en_json: enGlossaryArr,
        translation_status: translationStatus,
        translation_provider: translationProvider,
        translated_at: translatedAt,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      throw new Error(`Supabase createAdminPost failed: ${error?.message || 'Unknown error'}`);
    }
    createdId = Number(inserted.id);
  } else {
    const db = getDb();
    const maxOrderRow = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM posts WHERE section = ?')
      .get(section) as { maxOrder: number };

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
        JSON.stringify(enPreviewParagraphsArr),
        enContentHtml,
        enQuote,
        enQuoteSource,
        JSON.stringify(enGlossaryArr),
        translationStatus,
        translationProvider,
        translatedAt,
        publishedAt,
        now,
        now
      );

    createdId = Number(result.lastInsertRowid);
  }

  if (finalStatus === 'published' && (!hasExplicitEn || Boolean(body.retranslateOnSave))) {
    await runTranslationAndSave(createdId);
  }

  const createdRow = (await getPostRowWithAuthorById(createdId))!;
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

  const existing = await getRawPostById(id);
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
  const slug = body.slug ? await ensureUniqueSlug(String(body.slug), id) : existing.slug;
  const contentHtml =
    body.contentHtml !== undefined
      ? sanitizeRichHtml(String(body.contentHtml))
      : existing.content_html;
  const previewParagraphs =
    body.previewParagraphs !== undefined
      ? derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt)
      : safeJsonValue<string[]>(existing.preview_paragraphs_json, []);
  const glossary =
    body.glossary !== undefined
      ? sanitizeGlossary(body.glossary)
      : safeJsonValue<GlossaryItem[]>(existing.glossary_json, []);

  const sectionMeta =
    section === 'bento'
      ? normalizeBentoMeta(
          (body.bentoConfig as Record<string, unknown> | undefined) ??
            safeJsonValue<Record<string, unknown>>(existing.section_meta_json, {})
        )
      : normalizeStoryMeta(
          (body.storyConfig as Record<string, unknown> | undefined) ??
            safeJsonValue<Record<string, unknown>>(existing.section_meta_json, {})
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
  const enPreviewParagraphsArr =
    isAdmin && body.previewParagraphsEn !== undefined
      ? sanitizeStringArray(body.previewParagraphsEn)
      : safeJsonValue<string[]>(existing.preview_paragraphs_en_json, []);
  const enContentHtml =
    isAdmin && body.contentHtmlEn !== undefined
      ? sanitizeRichHtml(String(body.contentHtmlEn))
      : existing.content_html_en;
  const enQuote = isAdmin && body.quoteEn !== undefined ? String(body.quoteEn) : existing.quote_en;
  const enQuoteSource =
    isAdmin && body.quoteSourceEn !== undefined
      ? String(body.quoteSourceEn)
      : existing.quote_source_en;
  const enGlossaryArr =
    isAdmin && body.glossaryEn !== undefined
      ? sanitizeGlossary(body.glossaryEn)
      : safeJsonValue<GlossaryItem[]>(existing.glossary_en_json, []);

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

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('posts')
      .update({
        slug,
        section,
        status: nextStatus,
        cover_image: String(body.image ?? existing.cover_image).trim(),
        image_alt: String(body.imageAlt ?? existing.image_alt).trim(),
        theme_key: themeKey,
        section_meta_json: sectionMeta,
        title,
        excerpt,
        category: String(body.category ?? existing.category).trim(),
        location: String(body.location ?? existing.location).trim(),
        read_time: String(body.readTime ?? existing.read_time).trim(),
        cta_label: String(body.cta ?? existing.cta_label).trim(),
        preview_paragraphs_json: previewParagraphs,
        content_html: contentHtml,
        quote: String(body.quote ?? existing.quote).trim(),
        quote_source: String(body.quoteSource ?? existing.quote_source).trim(),
        glossary_json: glossary,
        title_en: enTitle,
        excerpt_en: enExcerpt,
        category_en: enCategory,
        location_en: enLocation,
        read_time_en: enReadTime,
        cta_label_en: enCta,
        preview_paragraphs_en_json: enPreviewParagraphsArr,
        content_html_en: enContentHtml,
        quote_en: enQuote,
        quote_source_en: enQuoteSource,
        glossary_en_json: enGlossaryArr,
        translation_status: nextTranslationStatus,
        translation_provider: nextTranslationProvider,
        translated_at: nextTranslatedAt,
        published_at: publishedAt,
        updated_at: now,
      })
      .eq('id', id);

    if (error) throw new Error(`Supabase updateAdminPost failed: ${error.message}`);
  } else {
    const db = getDb();
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
      JSON.stringify(enPreviewParagraphsArr),
      enContentHtml,
      enQuote,
      enQuoteSource,
      JSON.stringify(enGlossaryArr),
      nextTranslationStatus,
      nextTranslationProvider,
      nextTranslatedAt,
      publishedAt,
      now,
      id
    );
  }

  const hasCustomEnTranslation = Boolean(enTitle.trim() && enContentHtml.trim());
  const shouldAutoTranslate =
    Boolean(body.retranslateOnSave) ||
    (nextStatus === 'published' && existing.status !== 'published' && !hasCustomEnTranslation);

  if (shouldAutoTranslate) {
    await runTranslationAndSave(id);
  }

  return mapRowToAdminPost((await getPostRowWithAuthorById(id))!);
}

export async function submitAdminPost(user: AuthUser, id: number): Promise<CmsPostAdmin> {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }
  if (user.role === 'writer' && existing.author_id !== user.id) {
    throw new ServiceError(403, 'FORBIDDEN', 'Bạn chỉ có thể gửi duyệt bài viết của chính mình.');
  }

  const now = new Date().toISOString();

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('posts')
      .update({ status: 'in_review', review_note: '', updated_at: now })
      .eq('id', id);
    if (error) throw new Error(`Supabase submitAdminPost failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      "UPDATE posts SET status = 'in_review', review_note = '', updated_at = ? WHERE id = ?"
    ).run(now, id);
  }

  return mapRowToAdminPost((await getPostRowWithAuthorById(id))!);
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

  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  const now = new Date().toISOString();
  const cleanedNote = reviewNote.trim();

  if (action === 'publish') {
    if (isUsingSupabase()) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'published',
          reviewed_by: admin.id,
          review_note: '',
          published_at: existing.published_at || now,
          updated_at: now,
        })
        .eq('id', id);
      if (error) throw new Error(`Supabase reviewAdminPost publish failed: ${error.message}`);
    } else {
      const db = getDb();
      db.prepare(
        `UPDATE posts
         SET status = 'published', reviewed_by = ?, review_note = '', published_at = COALESCE(published_at, ?), updated_at = ?
         WHERE id = ?`
      ).run(admin.id, now, now, id);
    }

    const alreadyTranslatedByAgent =
      existing.translation_status === 'translated' &&
      Boolean(existing.title_en.trim()) &&
      Boolean(existing.content_html_en.trim()) &&
      existing.translation_provider !== 'local-fallback';

    if (!alreadyTranslatedByAgent) {
      await runTranslationAndSave(id);
    }
  } else {
    if (isUsingSupabase()) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'draft',
          reviewed_by: admin.id,
          review_note: cleanedNote,
          updated_at: now,
        })
        .eq('id', id);
      if (error) throw new Error(`Supabase reviewAdminPost return failed: ${error.message}`);
    } else {
      const db = getDb();
      db.prepare(
        `UPDATE posts
         SET status = 'draft', reviewed_by = ?, review_note = ?, updated_at = ?
         WHERE id = ?`
      ).run(admin.id, cleanedNote, now, id);
    }
  }

  return mapRowToAdminPost((await getPostRowWithAuthorById(id))!);
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

  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy bài viết.');
  }

  await runTranslationAndSave(id);
  return mapRowToAdminPost((await getPostRowWithAuthorById(id))!);
}

export async function saveCustomTranslation(
  user: AuthUser,
  id: number,
  body: Record<string, unknown>
): Promise<CmsPostAdmin> {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const existing = await getRawPostById(id);
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
      : safeJsonValue<string[]>(existing.preview_paragraphs_en_json, []);

  const quoteEn = String(body.quoteEn ?? body.quote ?? existing.quote_en).trim();
  const quoteSourceEn = String(
    body.quoteSourceEn ?? body.quoteSource ?? existing.quote_source_en
  ).trim();

  const rawGlossary = body.glossaryEn ?? body.glossary;
  const glossaryEn =
    rawGlossary !== undefined
      ? sanitizeGlossary(rawGlossary)
      : safeJsonValue<GlossaryItem[]>(existing.glossary_en_json, []);

  if (!titleEn || !excerptEn) {
    throw new ServiceError(
      400,
      'VALIDATION_ERROR',
      'Bản dịch tiếng Anh cần có tối thiểu titleEn và excerptEn.'
    );
  }

  const provider = String(body.provider || body.translationProvider || 'ai-agent').trim();
  const now = new Date().toISOString();

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('posts')
      .update({
        title_en: titleEn,
        excerpt_en: excerptEn,
        category_en: categoryEn,
        location_en: locationEn,
        read_time_en: readTimeEn,
        cta_label_en: ctaEn,
        preview_paragraphs_en_json: previewParagraphsEn,
        content_html_en: contentHtmlEn,
        quote_en: quoteEn,
        quote_source_en: quoteSourceEn,
        glossary_en_json: glossaryEn,
        translation_status: 'translated',
        translation_provider: provider,
        translated_at: now,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(`Supabase saveCustomTranslation failed: ${error.message}`);
  } else {
    const db = getDb();
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
  }

  return mapRowToAdminPost((await getPostRowWithAuthorById(id))!);
}

export async function reorderAdminPosts(
  admin: AuthUser,
  sectionInput: unknown,
  orderedIdsInput: unknown
): Promise<void> {
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

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    await Promise.all(
      orderedIds.map(async (postId: number, idx: number) => {
        const { error } = await supabase
          .from('posts')
          .update({ sort_order: idx })
          .eq('id', postId)
          .eq('section', section);
        if (error) throw new Error(`Supabase reorderAdminPosts failed: ${error.message}`);
      })
    );
    return;
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

export async function deleteAdminPost(user: AuthUser, id: number): Promise<void> {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID bài viết không hợp lệ.');
  }

  const existing = await getRawPostById(id);

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

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw new Error(`Supabase deleteAdminPost failed: ${error.message}`);
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

export async function getCmsStatsAndContext(sectionFilter?: string): Promise<{
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
}> {
  type StatsRow = {
    id: number;
    slug: string;
    section: CmsSectionType;
    status: 'draft' | 'in_review' | 'published';
    theme_key: ThemeType;
    title: string;
    category: string;
    location: string;
    translation_status: TranslationStatus;
  };

  let rows: StatsRow[];
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('posts')
      .select('id, slug, section, status, theme_key, title, category, location, translation_status');
    if (sectionFilter === 'bento' || sectionFilter === 'stories') {
      query = query.eq('section', sectionFilter);
    }
    const { data, error } = await query
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw new Error(`Supabase getCmsStatsAndContext failed: ${error.message}`);
    rows = ((data || []) as StatsRow[]).map((r) => ({ ...r, id: Number(r.id) }));
  } else {
    const db = getDb();
    let sql =
      'SELECT id, slug, section, status, theme_key, title, category, location, translation_status FROM posts';
    const params: string[] = [];
    if (sectionFilter === 'bento' || sectionFilter === 'stories') {
      sql += ' WHERE section = ?';
      params.push(sectionFilter);
    }
    sql += ' ORDER BY section ASC, sort_order ASC, id ASC';
    rows = db.prepare(sql).all(...params) as StatsRow[];
  }

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
