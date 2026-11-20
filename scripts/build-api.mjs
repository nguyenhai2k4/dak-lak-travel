import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const outFile = path.resolve('server/bundle/app.mjs');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

await build({
  entryPoints: [path.resolve('server/app.ts')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  packages: 'external',
  outfile: outFile,
});

console.log(`[build-api] Bundled Express server -> ${path.relative(process.cwd(), outFile)}`);
