import { Router } from 'express';
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from '../config.ts';
import { getDb } from '../db/database.ts';
import {
  createSession,
  deleteSession,
  extractSessionTokenFromRequest,
  getAuthUserFromRequest,
  verifyPassword,
} from '../services/core/auth.ts';
import { UserRole } from '../../src/types/index.ts';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
    return;
  }

  const db = getDb();
  const user = db
    .prepare(
      'SELECT id, email, display_name, password_hash, role, is_active FROM users WHERE email = ?'
    )
    .get(email) as
    | {
        id: number;
        email: string;
        display_name: string;
        password_hash: string;
        role: UserRole;
        is_active: number;
      }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    return;
  }

  if (user.is_active !== 1) {
    res.status(403).json({ error: 'Tài khoản này đã bị tạm khóa.' });
    return;
  }

  const { token } = createSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    },
  });
});

authRouter.post('/logout', (req, res) => {
  const token = extractSessionTokenFromRequest(req);
  if (token) deleteSession(token);

  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Chưa đăng nhập.' });
    return;
  }
  res.json({ user });
});
