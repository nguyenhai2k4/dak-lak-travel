import {
  BentoMetaConfig,
  CmsPostAdmin,
  CmsPostPublic,
  CmsSectionType,
  GlossaryItem,
  Language,
  PostStatus,
  StoryMetaConfig,
  ThemeType,
  TranslationStatus,
} from '../../src/types/index.ts';

export interface PostDbRow {
  id: number;
  slug: string;
  legacy_key: string | null;
  section: CmsSectionType;
  status: PostStatus;
  sort_order: number;
  author_id: number | null;
  author_name?: string | null;
  reviewed_by: number | null;
  review_note: string;
  cover_image: string;
  image_alt: string;
  theme_key: ThemeType;
  section_meta_json: string;

  title: string;
  excerpt: string;
  category: string;
  location: string;
  read_time: string;
  cta_label: string;
  preview_paragraphs_json: string;
  content_html: string;
  quote: string;
  quote_source: string;
  glossary_json: string;

  title_en: string;
  excerpt_en: string;
  category_en: string;
  location_en: string;
  read_time_en: string;
  cta_label_en: string;
  preview_paragraphs_en_json: string;
  content_html_en: string;
  quote_en: string;
  quote_source_en: string;
  glossary_en_json: string;
  translation_status: TranslationStatus;
  translation_provider: string;
  translated_at: string | null;

  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapRowToPublicPost(row: PostDbRow, lang: Language): CmsPostPublic {
  const useEn = lang === 'en';
  const sectionMeta = safeJsonParse<Record<string, unknown>>(row.section_meta_json, {});
  const previewParagraphsVi = safeJsonParse<string[]>(row.preview_paragraphs_json, []);
  const previewParagraphsEn = safeJsonParse<string[]>(row.preview_paragraphs_en_json, []);
  const glossaryVi = safeJsonParse<GlossaryItem[]>(row.glossary_json, []);
  const glossaryEn = safeJsonParse<GlossaryItem[]>(row.glossary_en_json, []);

  return {
    id: row.id,
    slug: row.slug,
    legacyKey: row.legacy_key,
    section: row.section,
    status: row.status,
    sortOrder: row.sort_order,
    title: useEn && row.title_en ? row.title_en : row.title,
    excerpt: useEn && row.excerpt_en ? row.excerpt_en : row.excerpt,
    category: useEn && row.category_en ? row.category_en : row.category,
    location: useEn && row.location_en ? row.location_en : row.location,
    readTime: useEn && row.read_time_en ? row.read_time_en : row.read_time,
    cta: useEn && row.cta_label_en ? row.cta_label_en : row.cta_label,
    image: row.cover_image,
    imageAlt: row.image_alt || row.title,
    themeKey: row.theme_key,
    previewParagraphs:
      useEn && previewParagraphsEn.length > 0 ? previewParagraphsEn : previewParagraphsVi,
    contentHtml: useEn && row.content_html_en ? row.content_html_en : row.content_html,
    quote: useEn && row.quote_en ? row.quote_en : row.quote,
    quoteSource: useEn && row.quote_source_en ? row.quote_source_en : row.quote_source,
    glossary: useEn && glossaryEn.length > 0 ? glossaryEn : glossaryVi,
    bentoConfig:
      row.section === 'bento'
        ? {
            size: sectionMeta.size === 'small' ? 'small' : 'large',
            imageLayout: sectionMeta.imageLayout === 'left' ? 'left' : 'top',
            imageBgClass:
              typeof sectionMeta.imageBgClass === 'string' && sectionMeta.imageBgClass
                ? sectionMeta.imageBgClass
                : 'bg-[#132A1E]',
            isCultureHighlight: Boolean(sectionMeta.isCultureHighlight),
          }
        : undefined,
    storyConfig:
      row.section === 'stories'
        ? {
            gradient:
              typeof sectionMeta.gradient === 'string' && sectionMeta.gradient
                ? sectionMeta.gradient
                : 'from-[#132A1E] to-[#8C3B2B]',
            offsetClass:
              typeof sectionMeta.offsetClass === 'string' && sectionMeta.offsetClass
                ? sectionMeta.offsetClass
                : 'mt-0',
          }
        : undefined,
    authorId: row.author_id,
    authorName: row.author_name || 'Ban Biên Tập Đắk Lắk',
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    translationStatus: row.translation_status,
  };
}

export function mapRowToAdminPost(row: PostDbRow): CmsPostAdmin {
  const base = mapRowToPublicPost(row, 'vi');
  return {
    ...base,
    reviewNote: row.review_note || '',
    reviewedBy: row.reviewed_by,
    titleEn: row.title_en || '',
    excerptEn: row.excerpt_en || '',
    categoryEn: row.category_en || '',
    locationEn: row.location_en || '',
    readTimeEn: row.read_time_en || '',
    ctaEn: row.cta_label_en || '',
    previewParagraphsEn: safeJsonParse<string[]>(row.preview_paragraphs_en_json, []),
    contentHtmlEn: row.content_html_en || '',
    quoteEn: row.quote_en || '',
    quoteSourceEn: row.quote_source_en || '',
    glossaryEn: safeJsonParse<GlossaryItem[]>(row.glossary_en_json, []),
    translationProvider: row.translation_provider || '',
    translatedAt: row.translated_at,
    createdAt: row.created_at,
  };
}

export function normalizeBentoMeta(input?: Partial<BentoMetaConfig>): BentoMetaConfig {
  return {
    size: input?.size === 'small' ? 'small' : 'large',
    imageLayout: input?.imageLayout === 'left' ? 'left' : 'top',
    imageBgClass: input?.imageBgClass || 'bg-[#132A1E]',
    isCultureHighlight: Boolean(input?.isCultureHighlight),
  };
}

export function normalizeStoryMeta(input?: Partial<StoryMetaConfig>): StoryMetaConfig {
  return {
    gradient: input?.gradient || 'from-[#132A1E] to-[#8C3B2B]',
    offsetClass: input?.offsetClass || 'mt-0',
  };
}
