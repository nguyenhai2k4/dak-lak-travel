import {
  BentoMetaConfig,
  CmsPostAdmin,
  CmsPostPublic,
  CmsSectionType,
  CmsUser,
  GlossaryItem,
  Language,
  PostStatus,
  StoryMetaConfig,
  ThemeType,
} from '../src/types/index.ts';

export type TransportMode = 'auto' | 'http' | 'local';

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export interface CliGlobalOptions {
  json: boolean;
  mode: TransportMode;
  url: string;
  token?: string;
  as?: string;
  sessionFile: string;
  quiet: boolean;
  io?: CliIo;
}

export class CliError extends Error {
  exitCode: number;
  code: string;
  hint?: string;

  constructor(code: string, message: string, exitCode = 1, hint?: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export interface ParsedPostDocument {
  id?: number;
  slug?: string;
  section?: CmsSectionType;
  status?: PostStatus;
  themeKey?: ThemeType;
  title?: string;
  excerpt?: string;
  category?: string;
  location?: string;
  readTime?: string;
  cta?: string;
  image?: string;
  imageAlt?: string;
  previewParagraphs?: string[];
  contentMarkdown?: string;
  contentHtml?: string;
  quote?: string;
  quoteSource?: string;
  glossary?: GlossaryItem[];
  bentoConfig?: Partial<BentoMetaConfig>;
  storyConfig?: Partial<StoryMetaConfig>;

  // Bilingual English fields
  titleEn?: string;
  excerptEn?: string;
  categoryEn?: string;
  locationEn?: string;
  readTimeEn?: string;
  ctaEn?: string;
  previewParagraphsEn?: string[];
  contentMarkdownEn?: string;
  contentHtmlEn?: string;
  quoteEn?: string;
  quoteSourceEn?: string;
  glossaryEn?: GlossaryItem[];
  translationProvider?: string;
}

export interface ValidationIssue {
  field: string;
  level: 'error' | 'warning';
  message: string;
  hint?: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: {
    wordsVi: number;
    wordsEn: number;
    paragraphsVi: number;
    headingsVi: number;
    imagesVi: number;
    linksVi: number;
    estimatedReadTimeVi: string;
    hasQuote: boolean;
    glossaryCount: number;
    hasEnglishTranslation: boolean;
  };
}

export interface EditorialContextPayload {
  schema: {
    sections: CmsSectionType[];
    themes: ThemeType[];
    statuses: PostStatus[];
    storyGradients: Array<{ label: string; value: string }>;
    storyOffsets: string[];
    bentoSizes: Array<'large' | 'small'>;
    bentoImageLayouts: Array<'left' | 'top'>;
    requiredFields: string[];
    optionalFields: string[];
  };
  editorialGuidelines: string[];
  counts: {
    total: number;
    byStatus: Record<PostStatus, number>;
    bySection: Record<CmsSectionType, number>;
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
    translationStatus: string;
  }>;
}

export interface SessionInfo {
  url: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    displayName: string;
    role: 'admin' | 'writer';
  };
  updatedAt: string;
}

export interface CmsClient {
  readonly transport: 'http' | 'local';
  readonly target: string;
  getActor(): Promise<{ id: number; email: string; displayName: string; role: 'admin' | 'writer' } | null>;
  health(): Promise<{ ok: boolean; transport: 'http' | 'local'; target: string }>;
  login(email: string, password: string): Promise<SessionInfo>;
  logout(): Promise<void>;
  getContext(section?: CmsSectionType): Promise<EditorialContextPayload>;
  listPublicPosts(lang: Language, section?: CmsSectionType): Promise<CmsPostPublic[]>;
  getPublicPostBySlug(
    slug: string,
    lang: Language,
    preview?: boolean
  ): Promise<{ post: CmsPostPublic; related: CmsPostPublic[] }>;
  listAdminPosts(filters?: {
    section?: CmsSectionType;
    status?: PostStatus;
    q?: string;
    slug?: string;
  }): Promise<CmsPostAdmin[]>;
  getAdminPost(idOrSlug: string | number): Promise<CmsPostAdmin>;
  createPost(payload: Record<string, unknown>): Promise<CmsPostAdmin>;
  updatePost(id: number, payload: Record<string, unknown>): Promise<CmsPostAdmin>;
  submitPost(id: number): Promise<CmsPostAdmin>;
  reviewPost(
    id: number,
    action: 'publish' | 'return_draft' | 'unpublish',
    reviewNote?: string
  ): Promise<CmsPostAdmin>;
  retranslatePost(id: number): Promise<CmsPostAdmin>;
  saveTranslation(id: number, payload: Record<string, unknown>): Promise<CmsPostAdmin>;
  reorderPosts(section: CmsSectionType, orderedIds: number[]): Promise<void>;
  deletePost(id: number): Promise<void>;
  uploadImage(filePath: string): Promise<{ url: string; filename: string }>;
  listUsers(): Promise<CmsUser[]>;
  createUser(payload: {
    email: string;
    displayName: string;
    password: string;
    role: 'admin' | 'writer';
  }): Promise<CmsUser>;
  updateUser(
    id: number,
    payload: { isActive?: boolean; role?: 'admin' | 'writer' }
  ): Promise<CmsUser>;
}
