import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { initArizeTelemetry, shutdownArizeTelemetry } from './services/arizeTelemetry.ts';
import {
  DIST_DIR,
  getGeminiApiKey,
  getTavilyApiKey,
  PORT,
  TAVILY_COUNTRY,
  TAVILY_INCLUDE_ANSWER,
  TAVILY_SEARCH_DEPTH,
  TAVILY_TIMEOUT_MS,
  UPLOADS_DIR,
} from './config.ts';
import { ensureSeedData } from './db/seed.ts';
import { adminPostsRouter } from './routes/adminPostsRoutes.ts';
import { adminUsersRouter } from './routes/adminUsersRoutes.ts';
import { aiRouter } from './routes/aiRoutes.ts';
import { authRouter } from './routes/authRoutes.ts';
import { publicPostsRouter } from './routes/publicPostsRoutes.ts';
import { uploadRouter } from './routes/uploadRoutes.ts';

initArizeTelemetry();
ensureSeedData();

const app = express();
app.use(express.json({ limit: '4mb' }));

// Uploaded images
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/posts', publicPostsRouter);
app.use('/api/admin/posts', adminPostsRouter);
app.use('/api/admin/uploads', uploadRouter);
app.use('/api/admin/users', adminUsersRouter);

// Serve built SPA in production
if (process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`[DakLak CMS Server] Listening on http://localhost:${PORT}`);
  console.log(
    `[DakLak AI Config] gemini=${Boolean(getGeminiApiKey())}, tavily=${Boolean(getTavilyApiKey())} (depth=${TAVILY_SEARCH_DEPTH}, includeAnswer=${String(TAVILY_INCLUDE_ANSWER)}, timeoutMs=${TAVILY_TIMEOUT_MS}, country=${TAVILY_COUNTRY || 'any'})`
  );
});

const handleShutdown = () => {
  void shutdownArizeTelemetry().finally(() => {
    server.close(() => process.exit(0));
  });
};
process.once('SIGINT', handleShutdown);
process.once('SIGTERM', handleShutdown);
