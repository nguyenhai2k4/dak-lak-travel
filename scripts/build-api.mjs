import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
// Bundle sanitize-html (and its ESM-only htmlparser2 dep) inline to avoid ERR_REQUIRE_ESM on Vercel Node 24
const inlinePackages = new Set(['sanitize-html']);
const externalDeps = Object.keys(pkg.dependencies || {}).filter((name) => !inlinePackages.has(name));

const outFile = path.resolve('server/bundle/app.mjs');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

await build({
  entryPoints: [path.resolve('server/app.ts')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  external: [...externalDeps, 'node:*'],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  outfile: outFile,
});

console.log(`[build-api] Bundled Express server -> ${path.relative(process.cwd(), outFile)}`);
