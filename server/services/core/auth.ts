import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from '../../config.ts';
import { getDb, isUsingSupabase } from '../../db/database.ts';
import { getSupabaseAdmin } from '../../db/supabaseClient.ts';
import { UserRole } from '../../../src/types/index.ts';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = expires.toISOString();
  const createdAt = now.toISOString();

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('sessions').insert({
      token,
      user_id: userId,
      expires_at: expiresAt,
      created_at: createdAt,
    });
    if (error) {
      throw new Error(`Failed to create session in Supabase: ${error.message}`);
    }
    return { token, expiresAt };
  }

  const db = getDb();
  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    await supabase.from('sessions').delete().eq('token', token);
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function extractSessionTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  const headerToken = req.headers['x-cms-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export async function getAuthUserFromRequest(req: Request): Promise<AuthUser | null> {
  const token = extractSessionTokenFromRequest(req);
  if (!token) return null;

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: sessionRow, error } = await supabase
      .from('sessions')
      .select(
        'token, expires_at, user:users(id, email, display_name, role, is_active)'
      )
      .eq('token', token)
      .maybeSingle();

    if (error || !sessionRow) return null;

    const rawUser = Array.isArray(sessionRow.user) ? sessionRow.user[0] : sessionRow.user;
    if (!rawUser) return null;

    const userRow = rawUser as {
      id: number;
      email: string;
      display_name: string;
      role: UserRole;
      is_active: boolean | number;
    };
    const isActive = userRow.is_active === true || userRow.is_active === 1;

    if (new Date(sessionRow.expires_at).getTime() < Date.now() || !isActive) {
      await supabase.from('sessions').delete().eq('token', token);
      return null;
    }

    return {
      id: Number(userRow.id),
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
      isActive: true,
    };
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.role, u.is_active, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as
    | {
        id: number;
        email: string;
        display_name: string;
        role: UserRole;
        is_active: number;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now() || row.is_active !== 1) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1,
  };
}

export async function attachOptionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    req.authUser = (await getAuthUserFromRequest(req)) || undefined;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Vui lòng đăng nhập để truy cập cổng quản trị.' });
      return;
    }
    req.authUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Chưa xác thực người dùng.' });
    return;
  }
  if (req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.' });
    return;
  }
  next();
}
