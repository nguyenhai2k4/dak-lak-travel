import {
  CmsPostAdmin,
  CmsPostPublic,
  CmsSectionType,
  CmsUser,
  Language,
  PostStatus,
  UserRole,
} from '../types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Yêu cầu thất bại (${res.status})`);
  }
  return data;
}

export const cmsApi = {
  // Public posts
  async getPublicPosts(lang: Language, section?: CmsSectionType): Promise<CmsPostPublic[]> {
    const params = new URLSearchParams({ lang });
    if (section) params.set('section', section);
    const data = await requestJson<{ posts: CmsPostPublic[] }>(`/api/posts?${params.toString()}`);
    return data.posts;
  },

  async getPublicPostBySlug(
    slug: string,
    lang: Language,
    preview = false
  ): Promise<{ post: CmsPostPublic; related: CmsPostPublic[] }> {
    const params = new URLSearchParams({ lang });
    if (preview) params.set('preview', '1');
    return requestJson<{ post: CmsPostPublic; related: CmsPostPublic[] }>(
      `/api/posts/${encodeURIComponent(slug)}?${params.toString()}`
    );
  },

  // Auth
  async login(email: string, password: string): Promise<CmsUser> {
    const data = await requestJson<{ user: CmsUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data.user;
  },

  async logout(): Promise<void> {
    await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<CmsUser | null> {
    try {
      const data = await requestJson<{ user: CmsUser }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },

  // Admin / Writer Posts
  async getAdminPosts(filters?: {
    section?: CmsSectionType | 'all';
    status?: PostStatus | 'all';
    q?: string;
  }): Promise<CmsPostAdmin[]> {
    const params = new URLSearchParams();
    if (filters?.section && filters.section !== 'all') params.set('section', filters.section);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.q?.trim()) params.set('q', filters.q.trim());
    const qs = params.toString();
    const data = await requestJson<{ posts: CmsPostAdmin[] }>(
      `/api/admin/posts${qs ? `?${qs}` : ''}`
    );
    return data.posts;
  },

  async getAdminPostById(id: number): Promise<CmsPostAdmin> {
    const data = await requestJson<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}`);
    return data.post;
  },

  async createPost(payload: Partial<CmsPostAdmin>): Promise<CmsPostAdmin> {
    const data = await requestJson<{ post: CmsPostAdmin }>('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.post;
  },

  async updatePost(id: number, payload: Partial<CmsPostAdmin>): Promise<CmsPostAdmin> {
    const data = await requestJson<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.post;
  },

  async submitPostForReview(id: number): Promise<CmsPostAdmin> {
    const data = await requestJson<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/submit`, {
      method: 'POST',
    });
    return data.post;
  },

  async reviewPost(
    id: number,
    action: 'publish' | 'return_draft' | 'unpublish',
    reviewNote = ''
  ): Promise<CmsPostAdmin> {
    const data = await requestJson<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewNote }),
    });
    return data.post;
  },

  async retranslatePost(id: number): Promise<CmsPostAdmin> {
    const data = await requestJson<{ post: CmsPostAdmin }>(`/api/admin/posts/${id}/retranslate`, {
      method: 'POST',
    });
    return data.post;
  },

  async reorderPosts(section: CmsSectionType, orderedIds: number[]): Promise<void> {
    await requestJson<{ ok: boolean }>('/api/admin/posts/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ section, orderedIds }),
    });
  },

  async deletePost(id: number): Promise<void> {
    await requestJson<{ ok: boolean }>(`/api/admin/posts/${id}`, { method: 'DELETE' });
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const data = await requestJson<{ url: string }>('/api/admin/uploads', {
      method: 'POST',
      body: formData,
    });
    return data.url;
  },

  // Admin Users
  async getUsers(): Promise<CmsUser[]> {
    const data = await requestJson<{ users: CmsUser[] }>('/api/admin/users');
    return data.users;
  },

  async createUser(payload: {
    email: string;
    displayName: string;
    password: string;
    role: UserRole;
  }): Promise<CmsUser> {
    const data = await requestJson<{ user: CmsUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.user;
  },

  async updateUser(
    id: number,
    payload: { isActive?: boolean; role?: UserRole }
  ): Promise<CmsUser> {
    const data = await requestJson<{ user: CmsUser }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.user;
  },
};
