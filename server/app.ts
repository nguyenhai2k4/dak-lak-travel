import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { initArizeTelemetry } from './services/ai/arizeTelemetry.ts';
import { DIST_DIR, IS_VERCEL, UPLOADS_DIR } from './config.ts';
import { isUsingSupabase } from './db/database.ts';
import { ensureSeedData } from './db/seed.ts';
import { adminPostsRouter } from './routes/adminPostsRoutes.ts';
import { adminUsersRouter } from './routes/adminUsersRoutes.ts';
import { aiRouter } from './routes/aiRoutes.ts';
import { authRouter } from './routes/authRoutes.ts';
import { publicPostsRouter } from './routes/publicPostsRoutes.ts';
import { uploadRouter } from './routes/uploadRoutes.ts';

initArizeTelemetry();

let seedPromise: Promise<void> | null = null;

export function ensureSeedReady(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureSeedData().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

export const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));

// Health check (lightweight, also reports DB backend)
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: isUsingSupabase() ? 'supabase' : 'sqlite',
  });
});

// Lazily ensure initial seed data is ready before API requests (works for both serverless & long-lived servers)
app.use('/api', async (_req, _res, next) => {
  try {
    await ensureSeedReady();
    next();
  } catch (err) {
    next(err);
  }
});

// Local uploaded images fallback (when not using Supabase Storage)
if (!isUsingSupabase()) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    app.use('/uploads', express.static(UPLOADS_DIR));
  } catch {
    // Ignore if filesystem is read-only
  }
}

// API routes
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/posts', publicPostsRouter);
app.use('/api/admin/posts', adminPostsRouter);
app.use('/api/admin/uploads', uploadRouter);
app.use('/api/admin/users', adminUsersRouter);

// Serve built SPA in standalone Node production mode (Vercel serves dist/ via CDN)
if (!IS_VERCEL && process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Global JSON error handler for API routes
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  const message =
    err instanceof Error && process.env.NODE_ENV !== 'production'
      ? err.message
      : 'Đã xảy ra lỗi máy chủ nội bộ.';
  res.status(500).json({ error: message });
});

export default app;
