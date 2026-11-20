import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

// Create isolated temp environment before importing server modules
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daklak-cms-test-'));
const dbPath = path.join(tmpDir, 'test.db');
const uploadsDir = path.join(tmpDir, 'uploads');
const sessionFile = path.join(tmpDir, 'session.json');

process.env.CMS_DB_PATH = dbPath;
process.env.CMS_UPLOADS_DIR = uploadsDir;
process.env.CMS_SESSION_FILE = sessionFile;

// Import after setting env paths
const { ensureSeedData } = await import('../server/db/seed.ts');
const { closeDb } = await import('../server/db/database.ts');
const { authRouter } = await import('../server/routes/authRoutes.ts');
const { publicPostsRouter } = await import('../server/routes/publicPostsRoutes.ts');
const { adminPostsRouter } = await import('../server/routes/adminPostsRoutes.ts');
const { adminUsersRouter } = await import('../server/routes/adminUsersRoutes.ts');
const { uploadRouter } = await import('../server/routes/uploadRoutes.ts');
const { runCli } = await import('../cli/index.ts');

await ensureSeedData();

function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use('/uploads', express.static(uploadsDir));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/posts', publicPostsRouter);
  app.use('/api/admin/posts', adminPostsRouter);
  app.use('/api/admin/uploads', uploadRouter);
  app.use('/api/admin/users', adminUsersRouter);
  return app;
}

async function captureCli(argv: string[]): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  const outChunks: string[] = [];
  const errChunks: string[] = [];
  const code = await runCli(argv, {
    stdout: (text) => outChunks.push(text),
    stderr: (text) => errChunks.push(text),
  });
  return {
    code,
    stdout: outChunks.join(''),
    stderr: errChunks.join(''),
  };
}

test('Full AI-agent blog workflow over HTTP API and Local SQLite mode', async () => {
  const server = http.createServer(createTestApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Login as writer via HTTP
    const loginWriter = await captureCli([
      'auth',
      'login',
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--email',
      'writer@daklak.travel',
      '--password',
      'Writer@123',
      '--json',
    ]);
    assert.equal(loginWriter.code, 0, loginWriter.stderr);
    const loginWriterJson = JSON.parse(loginWriter.stdout);
    assert.equal(loginWriterJson.ok, true);
    assert.equal(loginWriterJson.user.role, 'writer');

    // 2. Context discovery
    const ctxRes = await captureCli([
      'context',
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--json',
    ]);
    assert.equal(ctxRes.code, 0, ctxRes.stderr);
    const ctxJson = JSON.parse(ctxRes.stdout);
    assert.equal(ctxJson.context.counts.total, 14);
    assert.ok(ctxJson.context.schema.themes.includes('coffee'));

    // 3. Create a local image & bilingual Markdown post
    const localImg = path.join(tmpDir, 'cover.png');
    // Minimal valid 1x1 PNG bytes
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    fs.writeFileSync(localImg, Buffer.from(pngBase64, 'base64'));

    const draftMdPath = path.join(tmpDir, 'ai-draft.md');
    fs.writeFileSync(
      draftMdPath,
      [
        '---',
        'slug: "ho-lak-chieu-mua"',
        'section: stories',
        'themeKey: nature',
        'status: draft',
        'title: "Hồ Lắk chiều mưa tháng Bảy"',
        'excerpt: "Mặt hồ phẳng lặng soi bóng thuyền độc mộc giữa làn mưa nhẹ cao nguyên."',
        'category: "Thiên nhiên"',
        'location: "Hồ Lắk • Đắk Lắk"',
        'image: "./cover.png"',
        'imageAlt: "Hồ Lắk trong chiều mưa"',
        'quote: "Mưa cao nguyên rơi chậm trên mặt nước."',
        'quoteSource: "— Người M’nông ven hồ"',
        'glossary:',
        '  - term: "Thuyền độc mộc"',
        '    def: "Thuyền khoét từ thân cây cổ thụ."',
        '---',
        '',
        '## Chiều trên mặt hồ',
        '',
        'Khi cơn mưa chiều ghé qua buôn Jun, mặt Hồ Lắk ánh lên sắc bạc dịu dàng.',
        '',
        '<!-- LANG:EN -->',
        '---',
        'title: "Lak Lake on a Rainy July Afternoon"',
        'excerpt: "Calm waters reflecting dugout canoes beneath gentle highland rain."',
        'category: "Nature"',
        'location: "Lak Lake • Dak Lak"',
        'cta: "Explore story"',
        'quote: "Highland rain falls gently on the water."',
        'quoteSource: "— Mnong lakeside elder"',
        'glossary:',
        '  - term: "Dugout canoe"',
        '    def: "Traditional boat carved from a single tree trunk."',
        '---',
        '',
        '## Afternoon on the Lake',
        '',
        'As afternoon rain visits Jun village, Lak Lake shimmers in soft silver light.',
      ].join('\n'),
      'utf8'
    );

    // 4. Validate draft file
    const valRes = await captureCli(['post', 'validate', draftMdPath, '--json']);
    assert.equal(valRes.code, 0, valRes.stderr);
    const valJson = JSON.parse(valRes.stdout);
    assert.equal(valJson.passed, true);

    // 5. Writer pushes draft with --upload-media and --submit
    const pushRes = await captureCli([
      'post',
      'push',
      draftMdPath,
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--upload-media',
      '--submit',
      '--json',
    ]);
    assert.equal(pushRes.code, 0, pushRes.stderr);
    const pushJson = JSON.parse(pushRes.stdout);
    assert.equal(pushJson.action, 'created');
    assert.equal(pushJson.post.status, 'in_review');
    assert.match(pushJson.post.image, /^\/uploads\/.*\.png$/);
    assert.equal(pushJson.uploadedMedia.length, 1);

    // 6. Writer cannot publish (RBAC check)
    const writerReview = await captureCli([
      'post',
      'review',
      'ho-lak-chieu-mua',
      '--action',
      'publish',
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--json',
    ]);
    assert.equal(writerReview.code, 3);

    // 7. Admin logs in, pushes AI-authored English translation, and publishes
    const loginAdmin = await captureCli([
      'auth',
      'login',
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--email',
      'admin@daklak.travel',
      '--password',
      'Admin@123',
      '--json',
    ]);
    assert.equal(loginAdmin.code, 0, loginAdmin.stderr);

    const translateRes = await captureCli([
      'post',
      'translate',
      'ho-lak-chieu-mua',
      '--file',
      draftMdPath,
      '--provider',
      'ai-agent-test',
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--json',
    ]);
    assert.equal(translateRes.code, 0, translateRes.stderr);
    const translateJson = JSON.parse(translateRes.stdout);
    assert.equal(translateJson.post.translationStatus, 'translated');
    assert.equal(translateJson.post.translationProvider, 'ai-agent-test');
    assert.equal(translateJson.post.titleEn, 'Lak Lake on a Rainy July Afternoon');

    const publishRes = await captureCli([
      'post',
      'review',
      'ho-lak-chieu-mua',
      '--action',
      'publish',
      '--http',
      '--url',
      baseUrl,
      '--session-file',
      sessionFile,
      '--json',
    ]);
    assert.equal(publishRes.code, 0, publishRes.stderr);
    const publishJson = JSON.parse(publishRes.stdout);
    assert.equal(publishJson.post.status, 'published');
    // Must preserve the AI-agent English translation rather than overwriting with fallback!
    assert.equal(publishJson.post.translationProvider, 'ai-agent-test');
    assert.equal(publishJson.post.titleEn, 'Lak Lake on a Rainy July Afternoon');

    // 8. Fetch public English post via --local mode too
    const publicEnRes = await captureCli([
      'post',
      'get',
      'ho-lak-chieu-mua',
      '--public',
      '--lang',
      'en',
      '--local',
      '--json',
    ]);
    assert.equal(publicEnRes.code, 0, publicEnRes.stderr);
    const publicEnJson = JSON.parse(publicEnRes.stdout);
    assert.equal(publicEnJson.transport, 'local');
    assert.equal(publicEnJson.post.title, 'Lak Lake on a Rainy July Afternoon');

    // 9. Pull bilingual Markdown back to disk
    const pulledPath = path.join(tmpDir, 'pulled.md');
    const pullRes = await captureCli([
      'post',
      'pull',
      'ho-lak-chieu-mua',
      '--bilingual',
      '--local',
      '--out',
      pulledPath,
      '--json',
    ]);
    assert.equal(pullRes.code, 0, pullRes.stderr);
    const pulledContent = fs.readFileSync(pulledPath, 'utf8');
    assert.match(pulledContent, /<!-- LANG:EN -->/);
    assert.match(pulledContent, /Lak Lake on a Rainy July Afternoon/);

    // 10. Delete requires --yes, then succeeds with --yes
    const delFail = await captureCli([
      'post',
      'delete',
      'ho-lak-chieu-mua',
      '--local',
      '--json',
    ]);
    assert.equal(delFail.code, 2);

    const delOk = await captureCli([
      'post',
      'delete',
      'ho-lak-chieu-mua',
      '--yes',
      '--local',
      '--json',
    ]);
    assert.equal(delOk.code, 0, delOk.stderr);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
