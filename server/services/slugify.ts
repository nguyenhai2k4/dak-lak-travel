import { getDb } from '../db/database.ts';

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

export function ensureUniqueSlug(rawTitleOrSlug: string, excludePostId?: number): string {
  const db = getDb();
  const base = slugifyVietnamese(rawTitleOrSlug);
  let candidate = base;
  let counter = 2;

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
