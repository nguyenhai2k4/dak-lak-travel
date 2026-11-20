import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_ADMIN_EMAIL,
  PORT,
  ROOT_DIR,
  UPLOADS_DIR,
} from '../server/config.ts';
import { getDb } from '../server/db/database.ts';
import { ensureSeedData } from '../server/db/seed.ts';
import { AuthUser, createSession, deleteSession, verifyPassword } from '../server/services/auth.ts';
import { isServiceError, ServiceError } from '../server/services/errors.ts';
import {
  createAdminPost,
  deleteAdminPost,
  getAdminPostByIdOrSlug,
  getCmsStatsAndContext,
  getPublicPostBySlug,
  listAdminPosts,
  listPublicPosts,
  reorderAdminPosts,
  retranslateAdminPost,
  reviewAdminPost,
  saveCustomTranslation,
  submitAdminPost,
  updateAdminPost,
} from '../server/services/postsService.ts';
import {
  createUser,
  findAuthUserByEmail,
  listUsers,
  updateUser,
} from '../server/services/usersService.ts';
import {
  CmsPostAdmin,
  CmsPostPublic,
  CmsSectionType,
  CmsUser,
  Language,
  PostStatus,
} from '../src/types/index.ts';
import {
  CliError,
  CliGlobalOptions,
  CmsClient,
  EditorialContextPayload,
  SessionInfo,
} from './types.ts';

export const DEFAULT_SESSION_FILE = path.join(ROOT_DIR, '.daklak-cms-session.json');

export const EDITORIAL_SCHEMA: EditorialContextPayload['schema'] = {
  sections: ['bento', 'stories'],
  themes: ['coffee', 'culture', 'nature', 'cuisine'],
  statuses: ['draft', 'in_review', 'published'],
  storyGradients: [
    { label: 'Rừng già & Đất đỏ', value: 'from-[#132A1E] to-[#8C3B2B]' },
    { label: 'Lá cà phê & Hổ phách', value: 'from-[#1D3B2A] to-[#B08968]' },
    { label: 'Đại ngàn Sêrêpốk', value: 'from-[#0F2419] to-[#2C4A3E]' },
    { label: 'Thổ cẩm Đỏ', value: 'from-[#8C3B2B] to-[#3B1E14]' },
    { label: 'Bình minh Hồ Lắk', value: 'from-[#182E22] to-[#D48C46]' },
  ],
  storyOffsets: ['mt-0', 'mt-2', 'mt-4', 'mt-6', 'mt-8'],
  bentoSizes: ['large', 'small'],
  bentoImageLayouts: ['left', 'top'],
  requiredFields: ['title', 'excerpt'],
  optionalFields: [
    'slug',
    'section',
    'themeKey',
    'status',
    'category',
    'location',
    'readTime',
    'cta',
    'image',
    'imageAlt',
    'previewParagraphs',
    'contentHtml',
    'quote',
    'quoteSource',
    'glossary',
    'bentoConfig',
    'storyConfig',
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
  ],
};

export const EDITORIAL_GUIDELINES: string[] = [
  'Primary language is Vietnamese (vi); English (en) pairs seamlessly via bilingual Markdown (<!-- LANG:EN -->) or `cms post translate`.',
  'Preserve proper Vietnamese & Central Highlands cultural names (Đắk Lắk, Buôn Ma Thuột, Ê Đê, M’nông, Sêrêpốk, Dray Nur, Hồ Lắk, Yok Đôn).',
  'Use `section: stories` for long-form Red Earth Stories and `section: bento` for curated Bento Overview cards.',
  'Include a pull-quote (`quote` + `quoteSource`) and 1-3 `glossary` items explaining local terms for richer modal & article pages.',
  'Workflow: draft -> in_review (`cms post submit`) -> published (`cms post review --action publish`, Admin only).',
  'Before publishing, run `cms post validate` to verify structure, word count, media URLs, and bilingual readiness.',
];

export function readSessionFile(filePath: string): SessionInfo | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as SessionInfo;
  } catch {
    return null;
  }
}

export function writeSessionFile(filePath: string, session: SessionInfo): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2) + '\n', 'utf8');
}

export function clearSessionFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function mapServiceErrorToCli(err: unknown): never {
  if (isServiceError(err)) {
    const exitCode =
      err.statusCode === 400
        ? 2
        : err.statusCode === 401 || err.statusCode === 403
          ? 3
          : err.statusCode === 404
            ? 4
            : 1;
    throw new CliError(err.code, err.message, exitCode);
  }
  if (err instanceof CliError) throw err;
  throw new CliError('INTERNAL_ERROR', err instanceof Error ? err.message : String(err), 1);
}

function mapHttpError(status: number, body: { error?: string; code?: string }, hint?: string): CliError {
  const code =
    body.code ||
    (status === 400
      ? 'VALIDATION_ERROR'
      : status === 401
        ? 'UNAUTHORIZED'
        : status === 403
          ? 'FORBIDDEN'
          : status === 404
            ? 'NOT_FOUND'
            : status === 409
              ? 'CONFLICT'
              : 'HTTP_ERROR');
  const exitCode = status === 400 ? 2 : status === 401 || status === 403 ? 3 : status === 404 ? 4 : 1;
  return new CliError(code, body.error || `HTTP request failed with status ${status}`, exitCode, hint);
}

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

class HttpCmsClient implements CmsClient {
  readonly transport = 'http' as const;
  readonly target: string;
  private token?: string;
  private sessionFile: string;

  constructor(url: string, sessionFile: string, token?: string) {
    this.target = url.replace(/\/+$/, '');
    this.sessionFile = sessionFile;
    const saved = readSessionFile(sessionFile);
    this.token = token || process.env.CMS_TOKEN || (saved?.url === this.target ? saved.token : undefined);
  }

  private async request<T>(
    apiPath: string,
    init?: RequestInit,
    allowAutoLogin = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${this.target}${apiPath}`, {
        ...init,
        headers,
      });
    } catch (err) {
      throw new CliError(
        'CONNECTION_ERROR',
        `Cannot reach CMS server at ${this.target}: ${err instanceof Error ? err.message : String(err)}`,
        1,
        'Start the server ("npm run dev:server") or run with "--local" for direct SQLite access.'
      );
    }

    const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };

    if (
      res.status === 401 &&
      allowAutoLogin &&
      process.env.CMS_EMAIL &&
      process.env.CMS_PASSWORD
    ) {
      await this.login(process.env.CMS_EMAIL, process.env.CMS_PASSWORD);
      return this.request<T>(apiPath, init, false);
    }

    if (!res.ok) {
      const hint =
        res.status === 401
          ? 'Authenticate with "npm run cms -- auth login --email <email> --password <password>".'
          : undefined;
      throw mapHttpError(res.status, data, hint);
    }

    return data;
  }

  async getActor() {
    if (!this.token && !(process.env.CMS_EMAIL && process.env.CMS_PASSWORD)) {
      return null;
    }
    try {
      const data = await this.request<{ user: AuthUser }>('/api/auth/me');
      return {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        role: data.user.role,
      };
    } catch (err) {
      if (err instanceof CliError && err.code === 'UNAUTHORIZED') return null;
      throw err;
    }
  }

  async health() {
    const data = await this.request<{ ok: boolean }>('/api/health', undefined, false);
    return { ok: Boolean(data.ok), transport: 'http' as const, target: this.target };
  }

  async login(email: string, password: string): Promise<SessionInfo> {
    const data = await this.request<{
      token?: string;
      user: { id: number; email: string; displayName: string; role: 'admin' | 'writer' };
    }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );

    this.token = data.token;
    const session: SessionInfo = {
      url: this.target,
      token: data.token,
      user: data.user,
      updatedAt: new Date().toISOString(),
    };
    writeSessionFile(this.sessionFile, session);
    return session;
  }

  async logout(): Promise<void> {
    if (this.token) {
      await this.request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, false).catch(
        () => undefined
      );
    }
    this.token = undefined;
    clearSessionFile(this.sessionFile);
  }

  async getContext(section?: CmsSectionType): Promise<EditorialContextPayload> {
    const qs = section ? `?section=${encodeURIComponent(section)}` : '';
    const data = await this.request<{
      counts: EditorialContextPayload['counts'];
      categories: string[];
      locations: string[];
      existingPosts: EditorialContextPayload['existingPosts'];
    }>(`/api/admin/posts/context${qs}`);

    return {
      schema: EDITORIAL_SCHEMA,
      editorialGuidelines: EDITORIAL_GUIDELINES,
      ...data,
    };
  }

  async listPublicPosts(lang: Language, section?: CmsSectionType): Promise<CmsPostPublic[]> {
    const params = new URLSearchParams({ lang });
    if (section) params.set('section', section);
    const data = await this.request<{ posts: CmsPostPublic[] }>(
      `/api/posts?${params.toString()}`,
      undefined,
      false
    );
    return data.posts;
  }

  async getPublicPostBySlug(
    slug: string,
    lang: Language,
    preview = false
  ): Promise<{ post: CmsPostPublic; related: CmsPostPublic[] }> {
    const params = new URLSearchParams({ lang });
    if (preview) params.set('preview', '1');
    return this.request<{ post: CmsPostPublic; related: CmsPostPublic[] }>(
      `/api/posts/${encodeURIComponent(slug)}?${params.toString()}`,
      undefined,
      false
    );
  }

  async listAdminPosts(filters?: {
    section?: CmsSectionType;
    status?: PostStatus;
    q?: string;
    slug?: string;
  }): Promise<CmsPostAdmin[]> {
    const params = new URLSearchParams();
    if (filters?.section) params.set('section', filters.section);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.slug) params.set('slug', filters.slug);
    const qs = params.toString();
    const data = await this.request<{ posts: CmsPostAdmin[] }>(
      `/api/admin/posts${qs ? `?${qs}` : ''}`
    );
    return data.posts;
  }

  async getAdminPost(idOrSlug: string | number): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>(
      `/api/admin/posts/${encodeURIComponent(String(idOrSlug))}`
    );
    return data.post;
  }

  async createPost(payload: Record<string, unknown>): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.post;
  }

  async updatePost(id: number, payload: Record<string, unknown>): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.post;
  }

  async submitPost(id: number): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/submit`, {
      method: 'POST',
    });
    return data.post;
  }

  async reviewPost(
    id: number,
    action: 'publish' | 'return_draft' | 'unpublish',
    reviewNote = ''
  ): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewNote }),
    });
    return data.post;
  }

  async retranslatePost(id: number): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/retranslate`, {
      method: 'POST',
    });
    return data.post;
  }

  async saveTranslation(id: number, payload: Record<string, unknown>): Promise<CmsPostAdmin> {
    const data = await this.request<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/translation`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.post;
  }

  async reorderPosts(section: CmsSectionType, orderedIds: number[]): Promise<void> {
    await this.request<{ ok: boolean }>('/api/admin/posts/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ section, orderedIds }),
    });
  }

  async deletePost(id: number): Promise<void> {
    await this.request<{ ok: boolean }>(`/api/admin/posts/${id}`, { method: 'DELETE' });
  }

  async uploadImage(filePath: string): Promise<{ url: string; filename: string }> {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new CliError('FILE_NOT_FOUND', `Image file not found: ${resolved}`, 2);
    }
    const ext = path.extname(resolved).toLowerCase();
    const mime = EXT_TO_MIME[ext];
    if (!mime) {
      throw new CliError(
        'INVALID_MEDIA',
        `Unsupported image format "${ext}". Supported: .jpg, .jpeg, .png, .webp, .gif`,
        2
      );
    }
    const stat = fs.statSync(resolved);
    if (stat.size > 5 * 1024 * 1024) {
      throw new CliError('MEDIA_TOO_LARGE', 'Image exceeds 5MB limit.', 2);
    }

    const buffer = fs.readFileSync(resolved);
    const formData = new FormData();
    formData.append('image', new Blob([buffer], { type: mime }), path.basename(resolved));

    return this.request<{ url: string; filename: string }>('/api/admin/uploads', {
      method: 'POST',
      body: formData,
    });
  }

  async listUsers(): Promise<CmsUser[]> {
    const data = await this.request<{ users: CmsUser[] }>('/api/admin/users');
    return data.users;
  }

  async createUser(payload: {
    email: string;
    displayName: string;
    password: string;
    role: 'admin' | 'writer';
  }): Promise<CmsUser> {
    const data = await this.request<{ user: CmsUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.user;
  }

  async updateUser(
    id: number,
    payload: { isActive?: boolean; role?: 'admin' | 'writer' }
  ): Promise<CmsUser> {
    const data = await this.request<{ user: CmsUser }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.user;
  }
}

class LocalCmsClient implements CmsClient {
  readonly transport = 'local' as const;
  readonly target: string;
  private asEmail?: string;
  private sessionFile: string;
  private seeded = false;

  constructor(sessionFile: string, asEmail?: string) {
    this.sessionFile = sessionFile;
    this.asEmail = asEmail;
    this.target = process.env.CMS_DB_PATH || path.join(ROOT_DIR, 'server', 'data', 'daklak.db');
  }

  private init(): void {
    if (this.seeded) return;
    ensureSeedData();
    this.seeded = true;
  }

  private resolveActor(): AuthUser {
    this.init();
    const saved = readSessionFile(this.sessionFile);
    const email = (
      this.asEmail ||
      process.env.CMS_EMAIL ||
      saved?.user?.email ||
      DEFAULT_ADMIN_EMAIL
    )
      .trim()
      .toLowerCase();

    const user = findAuthUserByEmail(email);
    if (!user) {
      throw new CliError(
        'UNAUTHORIZED',
        `No active CMS user found for "${email}".`,
        3,
        'Use "--as <email>" with an active user or run "auth login".'
      );
    }
    return user;
  }

  async getActor() {
    const u = this.resolveActor();
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
    };
  }

  async health() {
    this.init();
    getDb().prepare('SELECT 1').get();
    return { ok: true, transport: 'local' as const, target: this.target };
  }

  async login(email: string, password: string): Promise<SessionInfo> {
    this.init();
    const db = getDb();
    const cleaned = email.trim().toLowerCase();
    const row = db
      .prepare('SELECT id, email, display_name, password_hash, role, is_active FROM users WHERE email = ?')
      .get(cleaned) as
      | {
          id: number;
          email: string;
          display_name: string;
          password_hash: string;
          role: 'admin' | 'writer';
          is_active: number;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new CliError('UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác.', 3);
    }
    if (row.is_active !== 1) {
      throw new CliError('FORBIDDEN', 'Tài khoản này đã bị tạm khóa.', 3);
    }

    const { token } = createSession(row.id);
    const session: SessionInfo = {
      url: `http://localhost:${PORT}`,
      token,
      user: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
      },
      updatedAt: new Date().toISOString(),
    };
    writeSessionFile(this.sessionFile, session);
    return session;
  }

  async logout(): Promise<void> {
    this.init();
    const saved = readSessionFile(this.sessionFile);
    if (saved?.token) {
      deleteSession(saved.token);
    }
    clearSessionFile(this.sessionFile);
  }

  async getContext(section?: CmsSectionType): Promise<EditorialContextPayload> {
    this.init();
    const stats = getCmsStatsAndContext(section);
    return {
      schema: EDITORIAL_SCHEMA,
      editorialGuidelines: EDITORIAL_GUIDELINES,
      ...stats,
    };
  }

  async listPublicPosts(lang: Language, section?: CmsSectionType): Promise<CmsPostPublic[]> {
    this.init();
    return listPublicPosts(lang, section);
  }

  async getPublicPostBySlug(
    slug: string,
    lang: Language,
    preview = false
  ): Promise<{ post: CmsPostPublic; related: CmsPostPublic[] }> {
    this.init();
    try {
      const actor = preview ? this.resolveActor() : undefined;
      return getPublicPostBySlug(slug, lang, preview, actor);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async listAdminPosts(filters?: {
    section?: CmsSectionType;
    status?: PostStatus;
    q?: string;
    slug?: string;
  }): Promise<CmsPostAdmin[]> {
    try {
      return listAdminPosts(this.resolveActor(), filters);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async getAdminPost(idOrSlug: string | number): Promise<CmsPostAdmin> {
    try {
      return getAdminPostByIdOrSlug(this.resolveActor(), idOrSlug);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async createPost(payload: Record<string, unknown>): Promise<CmsPostAdmin> {
    try {
      return await createAdminPost(this.resolveActor(), payload);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async updatePost(id: number, payload: Record<string, unknown>): Promise<CmsPostAdmin> {
    try {
      return await updateAdminPost(this.resolveActor(), id, payload);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async submitPost(id: number): Promise<CmsPostAdmin> {
    try {
      return submitAdminPost(this.resolveActor(), id);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async reviewPost(
    id: number,
    action: 'publish' | 'return_draft' | 'unpublish',
    reviewNote = ''
  ): Promise<CmsPostAdmin> {
    try {
      return await reviewAdminPost(this.resolveActor(), id, action, reviewNote);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async retranslatePost(id: number): Promise<CmsPostAdmin> {
    try {
      return await retranslateAdminPost(this.resolveActor(), id);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async saveTranslation(id: number, payload: Record<string, unknown>): Promise<CmsPostAdmin> {
    try {
      return await saveCustomTranslation(this.resolveActor(), id, payload);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async reorderPosts(section: CmsSectionType, orderedIds: number[]): Promise<void> {
    try {
      reorderAdminPosts(this.resolveActor(), section, orderedIds);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async deletePost(id: number): Promise<void> {
    try {
      deleteAdminPost(this.resolveActor(), id);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async uploadImage(filePath: string): Promise<{ url: string; filename: string }> {
    this.resolveActor();
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new CliError('FILE_NOT_FOUND', `Image file not found: ${resolved}`, 2);
    }
    const ext = path.extname(resolved).toLowerCase();
    if (!EXT_TO_MIME[ext]) {
      throw new CliError(
        'INVALID_MEDIA',
        `Unsupported image format "${ext}". Supported: .jpg, .jpeg, .png, .webp, .gif`,
        2
      );
    }
    const stat = fs.statSync(resolved);
    if (stat.size > 5 * 1024 * 1024) {
      throw new CliError('MEDIA_TOO_LARGE', 'Image exceeds 5MB limit.', 2);
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const normalizedExt = ext === '.jpeg' ? '.jpg' : ext;
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${normalizedExt}`;
    fs.copyFileSync(resolved, path.join(UPLOADS_DIR, filename));
    return {
      url: `/uploads/${filename}`,
      filename,
    };
  }

  async listUsers(): Promise<CmsUser[]> {
    try {
      return listUsers(this.resolveActor());
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async createUser(payload: {
    email: string;
    displayName: string;
    password: string;
    role: 'admin' | 'writer';
  }): Promise<CmsUser> {
    try {
      return createUser(this.resolveActor(), payload);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }

  async updateUser(
    id: number,
    payload: { isActive?: boolean; role?: 'admin' | 'writer' }
  ): Promise<CmsUser> {
    try {
      return updateUser(this.resolveActor(), id, payload);
    } catch (err) {
      mapServiceErrorToCli(err);
    }
  }
}

async function isHttpHealthy(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 350);
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/health`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveClient(opts: CliGlobalOptions): Promise<CmsClient> {
  if (opts.mode === 'local') {
    return new LocalCmsClient(opts.sessionFile, opts.as);
  }
  if (opts.mode === 'http') {
    return new HttpCmsClient(opts.url, opts.sessionFile, opts.token);
  }

  // Auto mode: prefer running HTTP server, fall back to local SQLite if none is running
  const up = await isHttpHealthy(opts.url);
  if (up) {
    return new HttpCmsClient(opts.url, opts.sessionFile, opts.token);
  }
  return new LocalCmsClient(opts.sessionFile, opts.as);
}
