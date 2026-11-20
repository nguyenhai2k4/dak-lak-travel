import fs from 'node:fs';
import path from 'node:path';
import { CliError, CmsClient } from './types.ts';

function isLocalAssetPath(ref: string): boolean {
  const trimmed = (ref || '').trim();
  if (!trimmed) return false;
  if (/^(https?:\/\/|\/uploads\/|data:|mailto:|#)/i.test(trimmed)) return false;
  return true;
}

export async function uploadReferencedLocalMedia(
  client: CmsClient,
  payload: Record<string, unknown>,
  baseDir: string
): Promise<{ payload: Record<string, unknown>; uploaded: Array<{ from: string; to: string }> }> {
  const updated = { ...payload };
  const uploaded: Array<{ from: string; to: string }> = [];
  const cache = new Map<string, string>();

  const uploadIfLocal = async (ref: string): Promise<string> => {
    if (!isLocalAssetPath(ref)) return ref;
    const resolved = path.resolve(baseDir, ref);
    if (!fs.existsSync(resolved)) {
      throw new CliError(
        'MEDIA_NOT_FOUND',
        `Local image file not found: "${ref}" (resolved: ${resolved})`,
        2
      );
    }
    if (cache.has(resolved)) return cache.get(resolved)!;
    const res = await client.uploadImage(resolved);
    cache.set(resolved, res.url);
    uploaded.push({ from: ref, to: res.url });
    return res.url;
  };

  if (typeof updated.image === 'string') {
    updated.image = await uploadIfLocal(updated.image);
  }

  for (const field of ['contentHtml', 'contentHtmlEn'] as const) {
    const html = updated[field];
    if (typeof html !== 'string' || !html) continue;

    const matches = Array.from(html.matchAll(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi));
    let nextHtml = html;
    for (const m of matches) {
      const src = m[2];
      if (!isLocalAssetPath(src)) continue;
      const newUrl = await uploadIfLocal(src);
      nextHtml = nextHtml.replace(m[0], `<img${m[1]}src="${newUrl}"${m[3]}>`);
    }
    updated[field] = nextHtml;
  }

  return { payload: updated, uploaded };
}
