let appPromise = null;

async function loadApp() {
  if (!appPromise) {
    appPromise = import('../server/bundle/app.mjs').then((m) => m.default);
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err) {
    appPromise = null;
    console.error('[Vercel API Boot Error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'API boot failed',
        name: err instanceof Error ? err.name : 'Error',
        code: err && typeof err === 'object' && 'code' in err ? err.code : undefined,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
