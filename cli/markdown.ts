import { sanitizeRichHtml } from '../server/services/core/sanitize.ts';
import {
  CmsPostAdmin,
  CmsSectionType,
  GlossaryItem,
  ThemeType,
} from '../src/types/index.ts';
import { ParsedPostDocument } from './types.ts';

function normalizeNewlines(text: string): string {
  return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function renderInlineMarkdown(text: string): string {
  let out = escapeHtml(text);

  // Code spans first (protect their inner contents)
  const codeSpans: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${code}</code>`);
    return `@@CODE_SPAN_${idx}@@`;
  });

  // Images: ![alt](src "title") or ![alt](src)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, alt, src, title) => {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${src}" alt="${alt}"${titleAttr} />`;
    }
  );

  // Links: [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

  // Bold + italic
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Strikethrough
  out = out.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  // Italic
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

  // Restore code spans
  out = out.replace(/@@CODE_SPAN_(\d+)@@/g, (_m, idx) => codeSpans[Number(idx)] || '');
  return out;
}

export function markdownToHtml(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push('<hr />');
      i += 1;
      continue;
    }

    // Headings (# to ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(`<blockquote><p>${renderInlineMarkdown(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInlineMarkdown(lines[i].trim().replace(/^[-*+]\s+/, ''))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInlineMarkdown(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Standalone image line
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
      blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
      i += 1;
      continue;
    }

    // Paragraph (collect contiguous non-block lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith('```') ||
        /^#{1,4}\s+/.test(cur) ||
        cur.startsWith('>') ||
        /^[-*+]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(paraLines.join(' '))}</p>`);
  }

  return sanitizeRichHtml(blocks.join('\n'));
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  let md = normalizeNewlines(html);

  // Preserve pre/code blocks first
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_m, code) => {
    return `\n\n\`\`\`\n${decodeHtmlEntities(code.trim())}\n\`\`\`\n\n`;
  });

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n\n# ${stripInlineTags(c)}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${stripInlineTags(c)}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${stripInlineTags(c)}\n\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `\n\n#### ${stripInlineTags(c)}\n\n`);

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => {
    const inner = stripInlineTags(c.replace(/<\/?p[^>]*>/gi, ' ')).trim();
    return `\n\n> ${inner}\n\n`;
  });

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m: string, inner: string) => {
    const items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map(
      (match) => `- ${stripInlineTags(match[1])}`
    );
    return `\n\n${items.join('\n')}\n\n`;
  });

  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m: string, inner: string) => {
    const items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map(
      (match, idx) => `${idx + 1}. ${stripInlineTags(match[1])}`
    );
    return `\n\n${items.join('\n')}\n\n`;
  });

  // Horizontal rules & line breaks
  md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Paragraphs & figures
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n\n${stripInlineTags(c)}\n\n`);
  md = md.replace(/<\/?(?:figure|figcaption|div)[^>]*>/gi, '\n');

  md = stripInlineTags(md);
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function stripInlineTags(input: string): string {
  let text = input;
  text = text.replace(
    /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
    '![$2]($1)'
  );
  text = text.replace(
    /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    '![$1]($2)'
  );
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)');
  text = text.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, label) => `[${decodeHtmlEntities(label.replace(/<[^>]+>/g, ''))}](${href})`
  );
  text = text.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  text = text.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');
  text = text.replace(/<(?:s|strike|del)[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi, '~~$1~~');
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  text = text.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(text).replace(/[ \t]+\n/g, '\n').trim();
}

function parseYamlScalar(raw: string): unknown {
  const val = raw.trim();
  if (val === '' || val === 'null' || val === '~') return '';
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);

  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    const inner = val.slice(1, -1);
    if (val.startsWith('"')) {
      return inner.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    }
    return inner.replace(/''/g, "'");
  }

  // Inline JSON array/object
  if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }

  return val;
}

export function parseYamlFrontmatter(yamlText: string): Record<string, unknown> {
  const lines = normalizeNewlines(yamlText).split('\n');
  const root: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i += 1;
      continue;
    }

    const topMatch = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!topMatch) {
      i += 1;
      continue;
    }

    const key = topMatch[1];
    const rest = topMatch[2].trim();

    // Multi-line folded/literal scalar
    if (rest === '|' || rest === '>') {
      const scalarLines: string[] = [];
      i += 1;
      while (i < lines.length && (/^\s+/.test(lines[i]) || lines[i].trim() === '')) {
        scalarLines.push(lines[i].replace(/^ {2}/, ''));
        i += 1;
      }
      root[key] =
        rest === '|' ? scalarLines.join('\n').trim() : scalarLines.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }

    if (rest !== '') {
      root[key] = parseYamlScalar(rest);
      i += 1;
      continue;
    }

    // Nested block (array or object)
    i += 1;
    const nestedLines: string[] = [];
    while (i < lines.length && (/^\s+/.test(lines[i]) || lines[i].trim() === '')) {
      if (lines[i].trim() !== '') nestedLines.push(lines[i]);
      i += 1;
    }

    if (nestedLines.length === 0) {
      root[key] = [];
      continue;
    }

    const firstTrimmed = nestedLines[0].trim();
    if (firstTrimmed.startsWith('- ')) {
      const items: unknown[] = [];
      let j = 0;
      while (j < nestedLines.length) {
        const cur = nestedLines[j].trim();
        if (!cur.startsWith('- ')) {
          j += 1;
          continue;
        }
        const afterDash = cur.slice(2).trim();
        const kvMatch = afterDash.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (kvMatch) {
          const obj: Record<string, unknown> = {
            [kvMatch[1]]: parseYamlScalar(kvMatch[2]),
          };
          j += 1;
          while (j < nestedLines.length && !nestedLines[j].trim().startsWith('- ')) {
            const subMatch = nestedLines[j].trim().match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
            if (subMatch) {
              obj[subMatch[1]] = parseYamlScalar(subMatch[2]);
            }
            j += 1;
          }
          items.push(obj);
        } else {
          items.push(parseYamlScalar(afterDash));
          j += 1;
        }
      }
      root[key] = items;
    } else {
      const obj: Record<string, unknown> = {};
      for (const nLine of nestedLines) {
        const kvMatch = nLine.trim().match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (kvMatch) {
          obj[kvMatch[1]] = parseYamlScalar(kvMatch[2]);
        }
      }
      root[key] = obj;
    }
  }

  return root;
}

function splitFrontmatter(markdown: string): { meta: Record<string, unknown>; body: string } {
  const normalized = normalizeNewlines(markdown).trimStart();
  if (!normalized.startsWith('---\n')) {
    return { meta: {}, body: normalized };
  }
  const endIdx = normalized.indexOf('\n---', 4);
  if (endIdx === -1) {
    return { meta: {}, body: normalized };
  }
  const yamlPart = normalized.slice(4, endIdx);
  const body = normalized.slice(endIdx + 4).replace(/^\n+/, '');
  return { meta: parseYamlFrontmatter(yamlPart), body };
}

export function estimateReadTime(textOrHtml: string, lang: 'vi' | 'en' = 'vi'): string {
  const plain = textOrHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plain ? plain.split(' ').length : 0;
  const mins = Math.max(1, Math.round(words / 200));
  return lang === 'en' ? `${mins} min read` : `${mins} phút đọc`;
}

export function extractPreviewParagraphsFromHtml(html: string, excerpt?: string): string[] {
  const extracted = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '')).trim())
    .filter((p) => p.length > 0 && !p.startsWith('!['))
    .slice(0, 2);

  if (extracted.length > 0) return extracted;
  return excerpt ? [excerpt] : [];
}

function coerceDocument(raw: Record<string, unknown>): ParsedPostDocument {
  const doc: ParsedPostDocument = {};
  if (raw.id !== undefined && raw.id !== '') doc.id = Number(raw.id);
  if (raw.slug) doc.slug = String(raw.slug);
  if (raw.section === 'bento' || raw.section === 'stories') doc.section = raw.section;
  if (raw.status === 'draft' || raw.status === 'in_review' || raw.status === 'published') {
    doc.status = raw.status;
  }
  if (
    raw.themeKey === 'coffee' ||
    raw.themeKey === 'culture' ||
    raw.themeKey === 'nature' ||
    raw.themeKey === 'cuisine'
  ) {
    doc.themeKey = raw.themeKey;
  }
  if (raw.title !== undefined) doc.title = String(raw.title);
  if (raw.excerpt !== undefined) doc.excerpt = String(raw.excerpt);
  if (raw.category !== undefined) doc.category = String(raw.category);
  if (raw.location !== undefined) doc.location = String(raw.location);
  if (raw.readTime !== undefined) doc.readTime = String(raw.readTime);
  if (raw.cta !== undefined) doc.cta = String(raw.cta);
  if (raw.image !== undefined) doc.image = String(raw.image);
  if (raw.imageAlt !== undefined) doc.imageAlt = String(raw.imageAlt);
  if (Array.isArray(raw.previewParagraphs)) {
    doc.previewParagraphs = raw.previewParagraphs.map((p) => String(p));
  }
  if (raw.contentHtml !== undefined) doc.contentHtml = String(raw.contentHtml);
  if (raw.contentMarkdown !== undefined) doc.contentMarkdown = String(raw.contentMarkdown);
  if (raw.quote !== undefined) doc.quote = String(raw.quote);
  if (raw.quoteSource !== undefined) doc.quoteSource = String(raw.quoteSource);
  if (Array.isArray(raw.glossary)) {
    doc.glossary = raw.glossary.map((g) => ({
      term: String((g as GlossaryItem)?.term || ''),
      def: String((g as GlossaryItem)?.def || ''),
    }));
  }
  if (raw.bentoConfig && typeof raw.bentoConfig === 'object') {
    doc.bentoConfig = raw.bentoConfig as ParsedPostDocument['bentoConfig'];
  }
  if (raw.storyConfig && typeof raw.storyConfig === 'object') {
    doc.storyConfig = raw.storyConfig as ParsedPostDocument['storyConfig'];
  }

  // English fields
  if (raw.titleEn !== undefined) doc.titleEn = String(raw.titleEn);
  if (raw.excerptEn !== undefined) doc.excerptEn = String(raw.excerptEn);
  if (raw.categoryEn !== undefined) doc.categoryEn = String(raw.categoryEn);
  if (raw.locationEn !== undefined) doc.locationEn = String(raw.locationEn);
  if (raw.readTimeEn !== undefined) doc.readTimeEn = String(raw.readTimeEn);
  if (raw.ctaEn !== undefined) doc.ctaEn = String(raw.ctaEn);
  if (Array.isArray(raw.previewParagraphsEn)) {
    doc.previewParagraphsEn = raw.previewParagraphsEn.map((p) => String(p));
  }
  if (raw.contentHtmlEn !== undefined) doc.contentHtmlEn = String(raw.contentHtmlEn);
  if (raw.contentMarkdownEn !== undefined) doc.contentMarkdownEn = String(raw.contentMarkdownEn);
  if (raw.quoteEn !== undefined) doc.quoteEn = String(raw.quoteEn);
  if (raw.quoteSourceEn !== undefined) doc.quoteSourceEn = String(raw.quoteSourceEn);
  if (Array.isArray(raw.glossaryEn)) {
    doc.glossaryEn = raw.glossaryEn.map((g) => ({
      term: String((g as GlossaryItem)?.term || ''),
      def: String((g as GlossaryItem)?.def || ''),
    }));
  }
  if (raw.translationProvider !== undefined) {
    doc.translationProvider = String(raw.translationProvider);
  }
  return doc;
}

export function parsePostInputFile(
  rawContent: string,
  formatHint?: 'md' | 'json'
): ParsedPostDocument {
  const trimmed = rawContent.trim();
  const isJson = formatHint === 'json' || (!formatHint && trimmed.startsWith('{'));

  if (isJson) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const doc = coerceDocument(parsed);
    if (!doc.contentHtml && doc.contentMarkdown) {
      doc.contentHtml = markdownToHtml(doc.contentMarkdown);
    }
    if (!doc.contentHtmlEn && doc.contentMarkdownEn) {
      doc.contentHtmlEn = markdownToHtml(doc.contentMarkdownEn);
    }
    return doc;
  }

  const { meta, body } = splitFrontmatter(rawContent);
  const doc = coerceDocument(meta);

  const enMarker = /<!--\s*LANG:EN\s*-->/i;
  const markerMatch = body.match(enMarker);
  if (markerMatch && markerMatch.index !== undefined) {
    const viBody = body.slice(0, markerMatch.index).trim();
    const enPart = body.slice(markerMatch.index + markerMatch[0].length).trim();

    if (viBody) {
      doc.contentMarkdown = viBody;
      doc.contentHtml = markdownToHtml(viBody);
    }

    const { meta: enMeta, body: enBody } = splitFrontmatter(enPart);
    if (enMeta.titleEn !== undefined || enMeta.title !== undefined) {
      doc.titleEn = String(enMeta.titleEn ?? enMeta.title);
    }
    if (enMeta.excerptEn !== undefined || enMeta.excerpt !== undefined) {
      doc.excerptEn = String(enMeta.excerptEn ?? enMeta.excerpt);
    }
    if (enMeta.categoryEn !== undefined || enMeta.category !== undefined) {
      doc.categoryEn = String(enMeta.categoryEn ?? enMeta.category);
    }
    if (enMeta.locationEn !== undefined || enMeta.location !== undefined) {
      doc.locationEn = String(enMeta.locationEn ?? enMeta.location);
    }
    if (enMeta.readTimeEn !== undefined || enMeta.readTime !== undefined) {
      doc.readTimeEn = String(enMeta.readTimeEn ?? enMeta.readTime);
    }
    if (enMeta.ctaEn !== undefined || enMeta.cta !== undefined) {
      doc.ctaEn = String(enMeta.ctaEn ?? enMeta.cta);
    }
    if (enMeta.quoteEn !== undefined || enMeta.quote !== undefined) {
      doc.quoteEn = String(enMeta.quoteEn ?? enMeta.quote);
    }
    if (enMeta.quoteSourceEn !== undefined || enMeta.quoteSource !== undefined) {
      doc.quoteSourceEn = String(enMeta.quoteSourceEn ?? enMeta.quoteSource);
    }
    const enGlossaryRaw = enMeta.glossaryEn ?? enMeta.glossary;
    if (Array.isArray(enGlossaryRaw)) {
      doc.glossaryEn = enGlossaryRaw.map((g) => ({
        term: String((g as GlossaryItem)?.term || ''),
        def: String((g as GlossaryItem)?.def || ''),
      }));
    }
    if (enBody.trim()) {
      doc.contentMarkdownEn = enBody.trim();
      doc.contentHtmlEn = markdownToHtml(enBody.trim());
    }
  } else if (body.trim()) {
    doc.contentMarkdown = body.trim();
    doc.contentHtml = markdownToHtml(body.trim());
  }

  return doc;
}

function yamlStr(val: string): string {
  const cleaned = (val || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${cleaned}"`;
}

function pushGlossaryYaml(lines: string[], key: string, items: GlossaryItem[]): void {
  if (!items || items.length === 0) return;
  lines.push(`${key}:`);
  for (const item of items) {
    lines.push(`  - term: ${yamlStr(item.term)}`);
    lines.push(`    def: ${yamlStr(item.def)}`);
  }
}

export function serializePostToMarkdown(
  post: CmsPostAdmin,
  options?: { bilingual?: boolean; lang?: 'vi' | 'en' }
): string {
  const lang = options?.lang || 'vi';
  const bilingual = Boolean(options?.bilingual);

  const lines: string[] = ['---'];
  lines.push(`id: ${post.id}`);
  lines.push(`slug: ${yamlStr(post.slug)}`);
  lines.push(`section: ${post.section}`);
  lines.push(`themeKey: ${post.themeKey}`);
  lines.push(`status: ${post.status}`);

  if (lang === 'en' && !bilingual) {
    lines.push(`title: ${yamlStr(post.titleEn || post.title)}`);
    lines.push(`excerpt: ${yamlStr(post.excerptEn || post.excerpt)}`);
    lines.push(`category: ${yamlStr(post.categoryEn || post.category)}`);
    lines.push(`location: ${yamlStr(post.locationEn || post.location)}`);
    lines.push(`readTime: ${yamlStr(post.readTimeEn || post.readTime)}`);
    lines.push(`cta: ${yamlStr(post.ctaEn || post.cta)}`);
    lines.push(`image: ${yamlStr(post.image)}`);
    lines.push(`imageAlt: ${yamlStr(post.imageAlt)}`);
    if (post.quoteEn || post.quote) lines.push(`quote: ${yamlStr(post.quoteEn || post.quote)}`);
    if (post.quoteSourceEn || post.quoteSource) {
      lines.push(`quoteSource: ${yamlStr(post.quoteSourceEn || post.quoteSource)}`);
    }
    pushGlossaryYaml(
      lines,
      'glossary',
      post.glossaryEn && post.glossaryEn.length > 0 ? post.glossaryEn : post.glossary
    );
  } else {
    lines.push(`title: ${yamlStr(post.title)}`);
    lines.push(`excerpt: ${yamlStr(post.excerpt)}`);
    lines.push(`category: ${yamlStr(post.category)}`);
    lines.push(`location: ${yamlStr(post.location)}`);
    lines.push(`readTime: ${yamlStr(post.readTime)}`);
    lines.push(`cta: ${yamlStr(post.cta)}`);
    lines.push(`image: ${yamlStr(post.image)}`);
    lines.push(`imageAlt: ${yamlStr(post.imageAlt)}`);
    if (post.quote) lines.push(`quote: ${yamlStr(post.quote)}`);
    if (post.quoteSource) lines.push(`quoteSource: ${yamlStr(post.quoteSource)}`);
    pushGlossaryYaml(lines, 'glossary', post.glossary || []);
  }

  if (post.bentoConfig) {
    lines.push('bentoConfig:');
    lines.push(`  size: ${post.bentoConfig.size}`);
    lines.push(`  imageLayout: ${post.bentoConfig.imageLayout}`);
    lines.push(`  imageBgClass: ${yamlStr(post.bentoConfig.imageBgClass)}`);
    lines.push(`  isCultureHighlight: ${Boolean(post.bentoConfig.isCultureHighlight)}`);
  }

  if (post.storyConfig) {
    lines.push('storyConfig:');
    lines.push(`  gradient: ${yamlStr(post.storyConfig.gradient)}`);
    lines.push(`  offsetClass: ${yamlStr(post.storyConfig.offsetClass)}`);
  }

  lines.push('---');
  lines.push('');

  const bodyHtml = lang === 'en' && !bilingual ? post.contentHtmlEn || post.contentHtml : post.contentHtml;
  lines.push(htmlToMarkdown(bodyHtml));

  if (bilingual) {
    lines.push('');
    lines.push('<!-- LANG:EN -->');
    lines.push('---');
    lines.push(`title: ${yamlStr(post.titleEn || '')}`);
    lines.push(`excerpt: ${yamlStr(post.excerptEn || '')}`);
    lines.push(`category: ${yamlStr(post.categoryEn || '')}`);
    lines.push(`location: ${yamlStr(post.locationEn || '')}`);
    lines.push(`readTime: ${yamlStr(post.readTimeEn || '')}`);
    lines.push(`cta: ${yamlStr(post.ctaEn || '')}`);
    lines.push(`quote: ${yamlStr(post.quoteEn || '')}`);
    lines.push(`quoteSource: ${yamlStr(post.quoteSourceEn || '')}`);
    pushGlossaryYaml(lines, 'glossary', post.glossaryEn || []);
    lines.push('---');
    lines.push('');
    lines.push(htmlToMarkdown(post.contentHtmlEn || ''));
  }

  return `${lines.join('\n').trim()}\n`;
}

export function documentToPostPayload(doc: ParsedPostDocument): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (doc.slug !== undefined) payload.slug = doc.slug;
  if (doc.section !== undefined) payload.section = doc.section;
  if (doc.status !== undefined) payload.status = doc.status;
  if (doc.themeKey !== undefined) payload.themeKey = doc.themeKey;
  if (doc.title !== undefined) payload.title = doc.title;
  if (doc.excerpt !== undefined) payload.excerpt = doc.excerpt;
  if (doc.category !== undefined) payload.category = doc.category;
  if (doc.location !== undefined) payload.location = doc.location;
  if (doc.cta !== undefined) payload.cta = doc.cta;
  if (doc.image !== undefined) payload.image = doc.image;
  if (doc.imageAlt !== undefined) payload.imageAlt = doc.imageAlt;
  if (doc.quote !== undefined) payload.quote = doc.quote;
  if (doc.quoteSource !== undefined) payload.quoteSource = doc.quoteSource;
  if (doc.glossary !== undefined) payload.glossary = doc.glossary;
  if (doc.bentoConfig !== undefined) payload.bentoConfig = doc.bentoConfig;
  if (doc.storyConfig !== undefined) payload.storyConfig = doc.storyConfig;

  const contentHtml =
    doc.contentHtml !== undefined
      ? sanitizeRichHtml(doc.contentHtml)
      : doc.contentMarkdown !== undefined
        ? markdownToHtml(doc.contentMarkdown)
        : undefined;

  if (contentHtml !== undefined) {
    payload.contentHtml = contentHtml;
  }

  if (doc.readTime !== undefined && doc.readTime.trim() !== '') {
    payload.readTime = doc.readTime;
  } else if (contentHtml) {
    payload.readTime = estimateReadTime(contentHtml, 'vi');
  }

  if (doc.previewParagraphs !== undefined) {
    payload.previewParagraphs = doc.previewParagraphs;
  } else if (contentHtml) {
    payload.previewParagraphs = extractPreviewParagraphsFromHtml(contentHtml, doc.excerpt);
  }

  // English fields
  if (doc.titleEn !== undefined) payload.titleEn = doc.titleEn;
  if (doc.excerptEn !== undefined) payload.excerptEn = doc.excerptEn;
  if (doc.categoryEn !== undefined) payload.categoryEn = doc.categoryEn;
  if (doc.locationEn !== undefined) payload.locationEn = doc.locationEn;
  if (doc.ctaEn !== undefined) payload.ctaEn = doc.ctaEn;
  if (doc.quoteEn !== undefined) payload.quoteEn = doc.quoteEn;
  if (doc.quoteSourceEn !== undefined) payload.quoteSourceEn = doc.quoteSourceEn;
  if (doc.glossaryEn !== undefined) payload.glossaryEn = doc.glossaryEn;
  if (doc.translationProvider !== undefined) payload.translationProvider = doc.translationProvider;

  const contentHtmlEn =
    doc.contentHtmlEn !== undefined
      ? sanitizeRichHtml(doc.contentHtmlEn)
      : doc.contentMarkdownEn !== undefined
        ? markdownToHtml(doc.contentMarkdownEn)
        : undefined;

  if (contentHtmlEn !== undefined) {
    payload.contentHtmlEn = contentHtmlEn;
  }

  if (doc.readTimeEn !== undefined && doc.readTimeEn.trim() !== '') {
    payload.readTimeEn = doc.readTimeEn;
  } else if (contentHtmlEn) {
    payload.readTimeEn = estimateReadTime(contentHtmlEn, 'en');
  }

  if (doc.previewParagraphsEn !== undefined) {
    payload.previewParagraphsEn = doc.previewParagraphsEn;
  } else if (contentHtmlEn) {
    payload.previewParagraphsEn = extractPreviewParagraphsFromHtml(contentHtmlEn, doc.excerptEn);
  }

  return payload;
}

export function generatePostTemplate(options: {
  section: CmsSectionType;
  themeKey: ThemeType;
  title?: string;
  bilingual?: boolean;
}): string {
  const title = options.title?.trim() || 'Câu chuyện mới từ cao nguyên Đắk Lắk';
  const lines = [
    '---',
    `section: ${options.section}`,
    `themeKey: ${options.themeKey}`,
    'status: draft',
    `title: ${yamlStr(title)}`,
    'excerpt: "Mô tả ngắn gọn 1-2 câu gợi cảm hứng cho thẻ bài viết."',
    'category: "Chuyện Đất Đỏ"',
    'location: "Buôn Ma Thuột • Đắk Lắk"',
    'readTime: "5 phút đọc"',
    'cta: "Khám phá câu chuyện"',
    'image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80"',
    `imageAlt: ${yamlStr(title)}`,
    'quote: "Trích dẫn đắt giá hoặc lời kể bản địa ngắn gọn."',
    'quoteSource: "— Người kể chuyện cao nguyên"',
    'glossary:',
    '  - term: "Từ khóa văn hóa"',
    '    def: "Giải thích ngắn gọn để du khách hiểu bối cảnh địa phương."',
  ];

  if (options.section === 'bento') {
    lines.push('bentoConfig:');
    lines.push('  size: small');
    lines.push('  imageLayout: top');
    lines.push('  imageBgClass: "bg-[#132A1E]"');
    lines.push('  isCultureHighlight: false');
  } else {
    lines.push('storyConfig:');
    lines.push('  gradient: "from-[#132A1E] to-[#8C3B2B]"');
    lines.push('  offsetClass: "mt-0"');
  }

  lines.push('---');
  lines.push('');
  lines.push(`## ${title}`);
  lines.push('');
  lines.push('Mở đầu bài viết bằng một khung cảnh cụ thể ở Đắk Lắk (âm thanh, mùi hương, ánh sáng).');
  lines.push('');
  lines.push('### Trải nghiệm & Góc nhìn bản địa');
  lines.push('');
  lines.push('Triển khai câu chuyện với chi tiết văn hóa, ẩm thực hoặc thiên nhiên đặc trưng.');
  lines.push('');
  lines.push('- Gợi ý thời điểm ghé thăm lý tưởng');
  lines.push('- Lưu ý trải nghiệm bền vững cùng cộng đồng địa phương');

  if (options.bilingual) {
    lines.push('');
    lines.push('<!-- LANG:EN -->');
    lines.push('---');
    lines.push('title: "English Title"');
    lines.push('excerpt: "Concise 1-2 sentence English teaser."');
    lines.push('category: "Red Earth Stories"');
    lines.push('location: "Buon Ma Thuot • Dak Lak"');
    lines.push('readTime: "5 min read"');
    lines.push('cta: "Explore story"');
    lines.push('quote: "Evocative local quote in English."');
    lines.push('quoteSource: "— Highland Storyteller"');
    lines.push('glossary:');
    lines.push('  - term: "Cultural term"');
    lines.push('    def: "Brief explanation for international travelers."');
    lines.push('---');
    lines.push('');
    lines.push('## English Heading');
    lines.push('');
    lines.push('Natural, evocative editorial English version of the story.');
  }

  return `${lines.join('\n')}\n`;
}
