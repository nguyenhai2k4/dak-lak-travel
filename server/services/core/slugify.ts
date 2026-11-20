import { getDb, isUsingSupabase } from '../../db/database.ts';
import { getSupabaseAdmin } from '../../db/supabaseClient.ts';

export function slugifyVietnamese(input: string): string {
  const cleaned = (input || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return cleaned || `bai-viet-${Date.now()}`;
}

export async function ensureUniqueSlug(
  rawTitleOrSlug: string,
  excludePostId?: number
): Promise<string> {
  const base = slugifyVietnamese(rawTitleOrSlug);
  let candidate = base;
  let counter = 2;

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    while (true) {
      let query = supabase.from('posts').select('id').eq('slug', candidate).limit(1);
      if (excludePostId) {
        query = query.neq('id', excludePostId);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Supabase slug check failed: ${error.message}`);
      }
      if (!data || data.length === 0) return candidate;
      candidate = `${base}-${counter}`;
      counter += 1;
    }
  }

  const db = getDb();
  while (true) {
    const existing = excludePostId
      ? (db
          .prepare('SELECT id FROM posts WHERE slug = ? AND id != ?')
          .get(candidate, excludePostId) as { id: number } | undefined)
      : (db.prepare('SELECT id FROM posts WHERE slug = ?').get(candidate) as
          | { id: number }
          | undefined);

    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}
