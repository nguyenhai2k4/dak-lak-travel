export default function handler(_req, res) {
  const supabaseEnvKeys = Object.keys(process.env)
    .filter((k) => /supa|postgres|database/i.test(k))
    .sort();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      ok: true,
      node: process.version,
      vercel: Boolean(process.env.VERCEL),
      supabaseConfigured: Boolean(
        process.env.SUPABASE_URL &&
          (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
      ),
      supabaseEnvKeys,
    })
  );
}
