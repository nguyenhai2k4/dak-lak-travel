import { shutdownArizeTelemetry } from './services/ai/arizeTelemetry.ts';
import {
  getGeminiApiKey,
  getTavilyApiKey,
  PORT,
  TAVILY_COUNTRY,
  TAVILY_INCLUDE_ANSWER,
  TAVILY_SEARCH_DEPTH,
  TAVILY_TIMEOUT_MS,
} from './config.ts';
import { isUsingSupabase } from './db/database.ts';
import { app, ensureSeedReady } from './app.ts';

async function startServer(): Promise<void> {
  try {
    await ensureSeedReady();
  } catch (err) {
    console.error('[DakLak Server] Initial seed failed:', err);
  }

  const server = app.listen(PORT, () => {
    console.log(
      `[DakLak CMS Server] Listening on http://localhost:${PORT} (db=${isUsingSupabase() ? 'supabase' : 'sqlite'})`
    );
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
}

void startServer();
