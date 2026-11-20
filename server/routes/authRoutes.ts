import { Router } from 'express';
import { IS_VERCEL, SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from '../config.ts';
import { findUserForLoginByEmail } from '../services/cms/usersService.ts';
import {
  createSession,
  deleteSession,
  extractSessionTokenFromRequest,
  getAuthUserFromRequest,
  verifyPassword,
} from '../services/core/auth.ts';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
      return;
    }

    const user = await findUserForLoginByEmail(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
      return;
    }

    const isActive = user.is_active === true || user.is_active === 1;
    if (!isActive) {
      res.status(403).json({ error: 'Tài khoản này đã bị tạm khóa.' });
      return;
    }

    const { token } = await createSession(Number(user.id));
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || IS_VERCEL,
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: {
        id: Number(user.id),
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = extractSessionTokenFromRequest(req);
    if (token) await deleteSession(token);

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Chưa đăng nhập.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
