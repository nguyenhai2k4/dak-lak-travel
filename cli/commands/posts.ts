import fs from 'node:fs';
import path from 'node:path';
import {
  getBoolFlag,
  getStringFlag,
  readInputFileText,
  readStdinText,
  requireStringFlag,
} from '../args.ts';
import { resolveClient } from '../client.ts';
import {
  documentToPostPayload,
  estimateReadTime,
  extractPreviewParagraphsFromHtml,
  generatePostTemplate,
  markdownToHtml,
  parsePostInputFile,
  serializePostToMarkdown,
} from '../markdown.ts';
import { uploadReferencedLocalMedia } from '../mediaHelper.ts';
import { printSuccess, truncate, writeStdout } from '../output.ts';
import { CliError, CliGlobalOptions, CmsClient, ParsedPostDocument } from '../types.ts';
import { validatePostPayload } from '../validate.ts';
import { CmsPostAdmin, CmsSectionType, Language, PostStatus, ThemeType } from '../../src/types/index.ts';

function parseSectionFlag(val?: string): CmsSectionType | undefined {
  if (!val) return undefined;
  if (val === 'bento' || val === 'stories') return val;
  throw new CliError('VALIDATION_ERROR', `Invalid --section "${val}". Use "bento" or "stories".`, 2);
}

function parseThemeFlag(val?: string): ThemeType | undefined {
  if (!val) return undefined;
  if (val === 'coffee' || val === 'culture' || val === 'nature' || val === 'cuisine') return val;
  throw new CliError(
    'VALIDATION_ERROR',
    `Invalid --theme "${val}". Use "coffee", "culture", "nature", or "cuisine".`,
    2
  );
}

function parseStatusFlag(val?: string): PostStatus | undefined {
  if (!val) return undefined;
  if (val === 'draft' || val === 'in_review' || val === 'published') return val;
  throw new CliError(
    'VALIDATION_ERROR',
    `Invalid --status "${val}". Use "draft", "in_review", or "published".`,
    2
  );
}

async function resolvePostPayloadFromFlags(
  flags: Record<string, string | boolean>
): Promise<{
  doc: ParsedPostDocument;
  payload: Record<string, unknown>;
  baseDir: string;
}> {
  let doc: ParsedPostDocument = {};
  let baseDir = process.cwd();

  const filePath = getStringFlag(flags, 'file');
  const useStdin = getBoolFlag(flags, 'stdin');

  if (filePath) {
    const resolved = path.resolve(filePath);
    baseDir = path.dirname(resolved);
    const raw = readInputFileText(resolved);
    const hint = resolved.toLowerCase().endsWith('.json') ? 'json' : undefined;
    doc = parsePostInputFile(raw, hint);
  } else if (useStdin) {
    const raw = await readStdinText();
    doc = parsePostInputFile(raw);
  }

  // Flag overrides
  const section = parseSectionFlag(getStringFlag(flags, 'section'));
  const themeKey = parseThemeFlag(getStringFlag(flags, 'theme'));
  const status = parseStatusFlag(getStringFlag(flags, 'status'));

  if (section) doc.section = section;
  if (themeKey) doc.themeKey = themeKey;
  if (status) doc.status = status;

  const strOverrides: Array<[string, keyof ParsedPostDocument]> = [
    ['title', 'title'],
    ['slug', 'slug'],
    ['excerpt', 'excerpt'],
    ['category', 'category'],
    ['location', 'location'],
    ['read-time', 'readTime'],
    ['cta', 'cta'],
    ['image', 'image'],
    ['image-alt', 'imageAlt'],
    ['quote', 'quote'],
    ['quote-source', 'quoteSource'],
    ['title-en', 'titleEn'],
    ['excerpt-en', 'excerptEn'],
    ['category-en', 'categoryEn'],
    ['location-en', 'locationEn'],
    ['read-time-en', 'readTimeEn'],
    ['cta-en', 'ctaEn'],
    ['quote-en', 'quoteEn'],
    ['quote-source-en', 'quoteSourceEn'],
    ['provider', 'translationProvider'],
  ];

  for (const [flagName, prop] of strOverrides) {
    const val = getStringFlag(flags, flagName);
    if (val !== undefined) {
      (doc as Record<string, unknown>)[prop] = val;
    }
  }

  const bodyFile = getStringFlag(flags, 'body-file');
  if (bodyFile) {
    const bodyText = readInputFileText(path.resolve(bodyFile));
    if (bodyFile.toLowerCase().endsWith('.html') || bodyFile.toLowerCase().endsWith('.htm')) {
      doc.contentHtml = bodyText;
    } else {
      doc.contentMarkdown = bodyText;
      doc.contentHtml = markdownToHtml(bodyText);
    }
  }

  const bodyHtml = getStringFlag(flags, 'body-html');
  if (bodyHtml !== undefined) {
    doc.contentHtml = bodyHtml;
  }

  const bodyMd = getStringFlag(flags, 'body-md');
  if (bodyMd !== undefined) {
    doc.contentMarkdown = bodyMd;
    doc.contentHtml = markdownToHtml(bodyMd);
  }

  const glossaryJson = getStringFlag(flags, 'glossary-json');
  if (glossaryJson !== undefined) {
    try {
      const parsed = JSON.parse(glossaryJson);
      if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
      doc.glossary = parsed;
    } catch (err) {
      throw new CliError(
        'VALIDATION_ERROR',
        `Invalid --glossary-json: ${err instanceof Error ? err.message : String(err)}`,
        2
      );
    }
  }

  if (flags['story-gradient'] || flags['story-offset']) {
    doc.storyConfig = {
      ...(doc.storyConfig || {}),
      ...(getStringFlag(flags, 'story-gradient')
        ? { gradient: getStringFlag(flags, 'story-gradient') }
        : {}),
      ...(getStringFlag(flags, 'story-offset')
        ? { offsetClass: getStringFlag(flags, 'story-offset') }
        : {}),
    };
  }

  if (flags['bento-size'] || flags['bento-layout'] || flags['is-culture-highlight'] !== undefined) {
    const sizeRaw = getStringFlag(flags, 'bento-size');
    const layoutRaw = getStringFlag(flags, 'bento-layout');
    doc.bentoConfig = {
      ...(doc.bentoConfig || {}),
      ...(sizeRaw === 'large' || sizeRaw === 'small' ? { size: sizeRaw } : {}),
      ...(layoutRaw === 'left' || layoutRaw === 'top' ? { imageLayout: layoutRaw } : {}),
      ...(flags['is-culture-highlight'] !== undefined
        ? { isCultureHighlight: getBoolFlag(flags, 'is-culture-highlight') }
        : {}),
    };
  }

  const payload = documentToPostPayload(doc);
  return { doc, payload, baseDir };
}

async function resolveTargetPost(client: CmsClient, idOrSlug: string): Promise<CmsPostAdmin> {
  if (!idOrSlug || !idOrSlug.trim()) {
    throw new CliError('MISSING_ARG', 'Provide a post ID or slug.', 2);
  }
  return client.getAdminPost(idOrSlug.trim());
}

export async function handlePostCommand(
  subcommand: string | undefined,
  positionals: string[],
  flags: Record<string, string | boolean>,
  opts: CliGlobalOptions
): Promise<number> {
  switch (subcommand) {
    case 'template': {
      const section = parseSectionFlag(getStringFlag(flags, 'section')) || 'stories';
      const themeKey = parseThemeFlag(getStringFlag(flags, 'theme')) || 'coffee';
      const title = getStringFlag(flags, 'title');
      const bilingual = getBoolFlag(flags, 'bilingual');
      const outPath = getStringFlag(flags, 'out');
      const content = generatePostTemplate({ section, themeKey, title, bilingual });

      if (outPath) {
        const resolved = path.resolve(outPath);
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content, 'utf8');
        printSuccess(opts, { out: resolved, section, themeKey, bilingual }, () => {
          console.log(`Scaffolded template -> ${resolved}`);
        });
      } else if (opts.json) {
        printSuccess(opts, { section, themeKey, bilingual, template: content }, () => {});
      } else {
        writeStdout(opts, content);
      }
      return 0;
    }

    case 'list': {
      const client = await resolveClient(opts);
      const isPublic = getBoolFlag(flags, 'public');
      const lang: Language = getStringFlag(flags, 'lang') === 'en' ? 'en' : 'vi';
      const section = parseSectionFlag(getStringFlag(flags, 'section'));
      const status = parseStatusFlag(getStringFlag(flags, 'status'));
      const q = getStringFlag(flags, 'q');
      const limitRaw = getStringFlag(flags, 'limit');
      const limit = limitRaw ? Number(limitRaw) : undefined;

      if (isPublic) {
        let posts = await client.listPublicPosts(lang, section);
        if (limit && Number.isFinite(limit) && limit > 0) {
          posts = posts.slice(0, limit);
        }
        printSuccess(opts, { transport: client.transport, count: posts.length, posts }, () => {
          console.log(`Published posts (${lang}, count=${posts.length}):`);
          for (const p of posts) {
            console.log(`  #${p.id} [${p.section}/${p.themeKey}] ${p.slug} — ${truncate(p.title, 64)}`);
          }
        });
        return 0;
      }

      let posts = await client.listAdminPosts({ section, status, q });
      if (limit && Number.isFinite(limit) && limit > 0) {
        posts = posts.slice(0, limit);
      }
      printSuccess(opts, { transport: client.transport, count: posts.length, posts }, () => {
        console.log(`Admin posts (count=${posts.length}, transport=${client.transport}):`);
        for (const p of posts) {
          console.log(
            `  #${p.id} [${p.section}/${p.themeKey}] (${p.status}, en:${p.translationStatus}) ${p.slug} — ${truncate(p.title, 56)}`
          );
        }
      });
      return 0;
    }

    case 'get': {
      const target = positionals[0];
      if (!target) {
        throw new CliError('MISSING_ARG', 'Usage: cms post get <id-or-slug>', 2);
      }
      const client = await resolveClient(opts);
      const isPublic = getBoolFlag(flags, 'public');
      const lang: Language = getStringFlag(flags, 'lang') === 'en' ? 'en' : 'vi';

      if (isPublic) {
        const result = await client.getPublicPostBySlug(target, lang, false);
        printSuccess(opts, { transport: client.transport, ...result }, () => {
          const p = result.post;
          console.log(`#${p.id} ${p.title} (${p.slug})`);
          console.log(`Section: ${p.section} | Theme: ${p.themeKey} | Category: ${p.category} | Location: ${p.location}`);
          console.log(`Excerpt: ${p.excerpt}`);
        });
        return 0;
      }

      const post = await resolveTargetPost(client, target);
      printSuccess(opts, { transport: client.transport, post }, () => {
        console.log(`#${post.id} ${post.title}`);
        console.log(`Slug: ${post.slug} | Status: ${post.status} | Section: ${post.section} | Theme: ${post.themeKey}`);
        console.log(`Author: ${post.authorName} | Translation: ${post.translationStatus} (${post.translationProvider || 'none'})`);
        console.log(`Category: ${post.category} | Location: ${post.location} | Read time: ${post.readTime}`);
        console.log(`Excerpt: ${post.excerpt}`);
        if (post.reviewNote) console.log(`Review note: ${post.reviewNote}`);
      });
      return 0;
    }

    case 'validate': {
      const target = positionals[0] || getStringFlag(flags, 'file');
      if (!target) {
        throw new CliError('MISSING_ARG', 'Usage: cms post validate <file-or-id-or-slug>', 2);
      }
      const strict = getBoolFlag(flags, 'strict');
      const resolvedFile = path.resolve(target);
      let report;
      let subject: string;

      if (fs.existsSync(resolvedFile) && fs.statSync(resolvedFile).isFile()) {
        const raw = fs.readFileSync(resolvedFile, 'utf8');
        const hint = resolvedFile.toLowerCase().endsWith('.json') ? 'json' : undefined;
        const doc = parsePostInputFile(raw, hint);
        const payload = documentToPostPayload(doc);
        report = validatePostPayload(payload, {
          baseDir: path.dirname(resolvedFile),
          checkTranslation: Boolean(doc.titleEn || doc.contentHtmlEn || doc.status === 'published'),
        });
        subject = resolvedFile;
      } else {
        const client = await resolveClient(opts);
        const post = await resolveTargetPost(client, target);
        report = validatePostPayload(post as unknown as Record<string, unknown>, {
          checkTranslation: true,
        });
        subject = `#${post.id} (${post.slug})`;
      }

      const passed = report.valid && (!strict || report.warnings.length === 0);
      printSuccess(opts, { subject, passed, strict, report }, () => {
        console.log(`Validation for ${subject}: ${passed ? 'PASS' : 'FAIL'}`);
        console.log(
          `Stats: ${report.stats.wordsVi} VI words (${report.stats.estimatedReadTimeVi}), ${report.stats.headingsVi} headings, ${report.stats.paragraphsVi} paragraphs, glossary=${report.stats.glossaryCount}, en=${report.stats.hasEnglishTranslation ? `${report.stats.wordsEn} words` : 'incomplete'}`
        );
        for (const e of report.errors) {
          console.log(`  [ERROR] (${e.field}) ${e.message}${e.hint ? ` -> ${e.hint}` : ''}`);
        }
        for (const w of report.warnings) {
          console.log(`  [WARN]  (${w.field}) ${w.message}${w.hint ? ` -> ${w.hint}` : ''}`);
        }
      });

      if (!passed) {
        return 2;
      }
      return 0;
    }

    case 'create': {
      const client = await resolveClient(opts);
      const { payload, baseDir } = await resolvePostPayloadFromFlags(flags);
      const report = validatePostPayload(payload, { baseDir });
      if (!report.valid) {
        const summary = report.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
        throw new CliError('VALIDATION_ERROR', summary, 2, report.errors[0]?.hint);
      }

      if (getBoolFlag(flags, 'dry-run')) {
        printSuccess(
          opts,
          { transport: client.transport, dryRun: true, payload, validation: report },
          () => {
            console.log('[DRY RUN] Validated create payload:');
            console.log(`  Title: ${String(payload.title)}`);
            console.log(`  Section: ${String(payload.section || 'bento')} | Status: ${String(payload.status || 'draft')}`);
            console.log(`  Words: ${report.stats.wordsVi} | Warnings: ${report.warnings.length}`);
          }
        );
        return 0;
      }

      const finalPayload = getBoolFlag(flags, 'upload-media')
        ? (await uploadReferencedLocalMedia(client, payload, baseDir)).payload
        : payload;

      const post = await client.createPost(finalPayload);
      printSuccess(opts, { transport: client.transport, post, validation: report }, () => {
        console.log(`Created post #${post.id} (${post.slug}) [${post.status}]`);
      });
      return 0;
    }

    case 'update': {
      const target = positionals[0];
      if (!target) {
        throw new CliError('MISSING_ARG', 'Usage: cms post update <id-or-slug> [flags]', 2);
      }
      const client = await resolveClient(opts);
      const existing = await resolveTargetPost(client, target);
      const { payload, baseDir } = await resolvePostPayloadFromFlags(flags);

      if (Object.keys(payload).length === 0) {
        throw new CliError('VALIDATION_ERROR', 'No update fields provided.', 2);
      }

      if (getBoolFlag(flags, 'dry-run')) {
        const merged = { ...existing, ...payload };
        const report = validatePostPayload(merged, { baseDir });
        printSuccess(
          opts,
          { transport: client.transport, dryRun: true, id: existing.id, payload, validation: report },
          () => {
            console.log(`[DRY RUN] Update preview for #${existing.id} (${existing.slug}):`);
            console.log(`  Changed keys: ${Object.keys(payload).join(', ')}`);
          }
        );
        return 0;
      }

      const finalPayload = getBoolFlag(flags, 'upload-media')
        ? (await uploadReferencedLocalMedia(client, payload, baseDir)).payload
        : payload;

      const post = await client.updatePost(existing.id, finalPayload);
      printSuccess(opts, { transport: client.transport, post }, () => {
        console.log(`Updated post #${post.id} (${post.slug}) [${post.status}]`);
      });
      return 0;
    }

    case 'pull': {
      const target = positionals[0];
      if (!target) {
        throw new CliError('MISSING_ARG', 'Usage: cms post pull <id-or-slug> [--format md|json] [--out file]', 2);
      }
      const client = await resolveClient(opts);
      const post = await resolveTargetPost(client, target);
      const format = getStringFlag(flags, 'format') === 'json' ? 'json' : 'md';
      const bilingual = getBoolFlag(flags, 'bilingual');
      const lang = getStringFlag(flags, 'lang') === 'en' ? 'en' : 'vi';
      const outPath = getStringFlag(flags, 'out');

      const serialized =
        format === 'json'
          ? JSON.stringify(post, null, 2) + '\n'
          : serializePostToMarkdown(post, { bilingual, lang });

      if (outPath) {
        const resolved = path.resolve(outPath);
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, serialized, 'utf8');
        printSuccess(
          opts,
          { transport: client.transport, id: post.id, slug: post.slug, format, out: resolved },
          () => {
            console.log(`Pulled #${post.id} (${post.slug}) -> ${resolved}`);
          }
        );
      } else if (opts.json) {
        printSuccess(
          opts,
          { transport: client.transport, id: post.id, slug: post.slug, format, content: serialized },
          () => {}
        );
      } else {
        writeStdout(opts, serialized);
      }
      return 0;
    }

    case 'push': {
      const filePath = positionals[0] || getStringFlag(flags, 'file');
      if (!filePath) {
        throw new CliError('MISSING_ARG', 'Usage: cms post push <file.md|file.json> [--upload-media] [--submit|--publish]', 2);
      }
      const resolved = path.resolve(filePath);
      const baseDir = path.dirname(resolved);
      const raw = readInputFileText(resolved);
      const hint = resolved.toLowerCase().endsWith('.json') ? 'json' : undefined;
      const doc = parsePostInputFile(raw, hint);

      const client = await resolveClient(opts);
      const explicitId = getStringFlag(flags, 'id');
      let existing: CmsPostAdmin | null = null;

      if (explicitId) {
        existing = await resolveTargetPost(client, explicitId);
      } else if (doc.id) {
        existing = await resolveTargetPost(client, String(doc.id)).catch(() => null);
      } else if (doc.slug) {
        const matches = await client.listAdminPosts({ slug: doc.slug });
        existing = matches[0] || null;
      }

      const payload = documentToPostPayload(doc);
      const mergedForValidation = existing ? { ...existing, ...payload } : payload;
      const report = validatePostPayload(mergedForValidation, { baseDir });
      if (!report.valid) {
        const summary = report.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
        throw new CliError('VALIDATION_ERROR', summary, 2, report.errors[0]?.hint);
      }

      if (getBoolFlag(flags, 'dry-run')) {
        printSuccess(
          opts,
          {
            transport: client.transport,
            dryRun: true,
            action: existing ? 'update' : 'create',
            targetId: existing?.id || null,
            validation: report,
          },
          () => {
            console.log(
              `[DRY RUN] Would ${existing ? `update #${existing.id}` : 'create new post'} from ${resolved}`
            );
          }
        );
        return 0;
      }

      const uploadedResult = getBoolFlag(flags, 'upload-media')
        ? await uploadReferencedLocalMedia(client, payload, baseDir)
        : { payload, uploaded: [] };

      let post = existing
        ? await client.updatePost(existing.id, uploadedResult.payload)
        : await client.createPost(uploadedResult.payload);

      if (getBoolFlag(flags, 'submit')) {
        post = await client.submitPost(post.id);
      } else if (getBoolFlag(flags, 'publish')) {
        post = await client.reviewPost(post.id, 'publish');
      }

      printSuccess(
        opts,
        {
          transport: client.transport,
          action: existing ? 'updated' : 'created',
          uploadedMedia: uploadedResult.uploaded,
          post,
          validation: report,
        },
        () => {
          console.log(
            `${existing ? 'Updated' : 'Created'} #${post.id} (${post.slug}) [status=${post.status}]`
          );
          if (uploadedResult.uploaded.length > 0) {
            console.log(`Uploaded ${uploadedResult.uploaded.length} local media file(s).`);
          }
        }
      );
      return 0;
    }

    case 'submit': {
      const target = positionals[0];
      if (!target) {
        throw new CliError('MISSING_ARG', 'Usage: cms post submit <id-or-slug>', 2);
      }
      const client = await resolveClient(opts);
      const existing = await resolveTargetPost(client, target);
      const post = await client.submitPost(existing.id);
      printSuccess(opts, { transport: client.transport, post }, () => {
        console.log(`Submitted #${post.id} (${post.slug}) for admin review [status=${post.status}]`);
      });
      return 0;
    }

    case 'review': {
      const target = positionals[0];
      if (!target) {
        throw new CliError(
          'MISSING_ARG',
          'Usage: cms post review <id-or-slug> --action publish|return_draft|unpublish [--note "..."]',
          2
        );
      }
      const action = requireStringFlag(
        flags,
        'action',
        'Use --action publish | return_draft | unpublish'
      );
      if (action !== 'publish' && action !== 'return_draft' && action !== 'unpublish') {
        throw new CliError(
          'VALIDATION_ERROR',
          `Invalid --action "${action}". Use publish, return_draft, or unpublish.`,
          2
        );
      }
      const note = getStringFlag(flags, 'note') || '';
      const client = await resolveClient(opts);
      const existing = await resolveTargetPost(client, target);
      const post = await client.reviewPost(existing.id, action, note);

      printSuccess(opts, { transport: client.transport, action, post }, () => {
        console.log(
          `Reviewed #${post.id} (${post.slug}) -> action=${action}, status=${post.status}, translation=${post.translationStatus}`
        );
      });
      return 0;
    }

    case 'translate': {
      const target = positionals[0];
      if (!target) {
        throw new CliError(
          'MISSING_ARG',
          'Usage: cms post translate <id-or-slug> [--auto | --file <md|json> | --title-en ...]',
          2
        );
      }
      const client = await resolveClient(opts);
      const existing = await resolveTargetPost(client, target);

      if (getBoolFlag(flags, 'auto')) {
        const post = await client.retranslatePost(existing.id);
        printSuccess(opts, { transport: client.transport, mode: 'auto', post }, () => {
          console.log(
            `Auto-translated #${post.id} (${post.slug}) -> status=${post.translationStatus}, provider=${post.translationProvider}`
          );
        });
        return 0;
      }

      const filePath = getStringFlag(flags, 'file');
      const useStdin = getBoolFlag(flags, 'stdin');
      let doc: ParsedPostDocument = {};

      if (filePath) {
        const resolved = path.resolve(filePath);
        const raw = readInputFileText(resolved);
        const hint = resolved.toLowerCase().endsWith('.json') ? 'json' : undefined;
        doc = parsePostInputFile(raw, hint);
      } else if (useStdin) {
        const raw = await readStdinText();
        doc = parsePostInputFile(raw);
      }

      const translationPayload: Record<string, unknown> = {
        provider: getStringFlag(flags, 'provider') || doc.translationProvider || 'ai-agent',
      };

      const titleEn = getStringFlag(flags, 'title-en') ?? doc.titleEn ?? doc.title;
      const excerptEn = getStringFlag(flags, 'excerpt-en') ?? doc.excerptEn ?? doc.excerpt;
      const categoryEn = getStringFlag(flags, 'category-en') ?? doc.categoryEn ?? doc.category;
      const locationEn = getStringFlag(flags, 'location-en') ?? doc.locationEn ?? doc.location;
      const readTimeEn = getStringFlag(flags, 'read-time-en') ?? doc.readTimeEn ?? doc.readTime;
      const ctaEn = getStringFlag(flags, 'cta-en') ?? doc.ctaEn ?? doc.cta;
      const quoteEn = getStringFlag(flags, 'quote-en') ?? doc.quoteEn ?? doc.quote;
      const quoteSourceEn =
        getStringFlag(flags, 'quote-source-en') ?? doc.quoteSourceEn ?? doc.quoteSource;

      let contentHtmlEn = doc.contentHtmlEn ?? doc.contentHtml;
      const bodyFile = getStringFlag(flags, 'body-file');
      if (bodyFile) {
        const bodyRaw = readInputFileText(path.resolve(bodyFile));
        contentHtmlEn = bodyFile.toLowerCase().endsWith('.html')
          ? bodyRaw
          : markdownToHtml(bodyRaw);
      } else if (getStringFlag(flags, 'body-html') !== undefined) {
        contentHtmlEn = getStringFlag(flags, 'body-html');
      } else if (getStringFlag(flags, 'body-md') !== undefined) {
        contentHtmlEn = markdownToHtml(getStringFlag(flags, 'body-md')!);
      }

      if (titleEn !== undefined) translationPayload.titleEn = titleEn;
      if (excerptEn !== undefined) translationPayload.excerptEn = excerptEn;
      if (categoryEn !== undefined) translationPayload.categoryEn = categoryEn;
      if (locationEn !== undefined) translationPayload.locationEn = locationEn;
      if (ctaEn !== undefined) translationPayload.ctaEn = ctaEn;
      if (quoteEn !== undefined) translationPayload.quoteEn = quoteEn;
      if (quoteSourceEn !== undefined) translationPayload.quoteSourceEn = quoteSourceEn;
      if (contentHtmlEn !== undefined) {
        translationPayload.contentHtmlEn = contentHtmlEn;
        translationPayload.previewParagraphsEn =
          doc.previewParagraphsEn ||
          extractPreviewParagraphsFromHtml(contentHtmlEn, excerptEn);
        translationPayload.readTimeEn = readTimeEn || estimateReadTime(contentHtmlEn, 'en');
      } else if (readTimeEn !== undefined) {
        translationPayload.readTimeEn = readTimeEn;
      }

      const glossaryEn = doc.glossaryEn ?? doc.glossary;
      if (glossaryEn !== undefined) translationPayload.glossaryEn = glossaryEn;

      const post = await client.saveTranslation(existing.id, translationPayload);
      printSuccess(opts, { transport: client.transport, mode: 'agent', post }, () => {
        console.log(
          `Saved English translation for #${post.id} (${post.slug}) -> provider=${post.translationProvider}`
        );
      });
      return 0;
    }

    case 'reorder': {
      const section = parseSectionFlag(requireStringFlag(flags, 'section'));
      const idsRaw = requireStringFlag(flags, 'ids', 'Pass comma-separated post IDs, e.g. --ids 1,2,3');
      const orderedIds = idsRaw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n));

      if (orderedIds.length === 0) {
        throw new CliError('VALIDATION_ERROR', 'No valid post IDs in --ids.', 2);
      }

      const client = await resolveClient(opts);
      await client.reorderPosts(section!, orderedIds);
      printSuccess(opts, { transport: client.transport, section, orderedIds }, () => {
        console.log(`Reordered ${section} posts: [${orderedIds.join(', ')}]`);
      });
      return 0;
    }

    case 'delete': {
      const target = positionals[0];
      if (!target) {
        throw new CliError('MISSING_ARG', 'Usage: cms post delete <id-or-slug> --yes', 2);
      }
      if (!getBoolFlag(flags, 'yes')) {
        throw new CliError(
          'CONFIRMATION_REQUIRED',
          'Deleting a post is irreversible. Pass --yes to confirm.',
          2
        );
      }
      const client = await resolveClient(opts);
      const existing = await resolveTargetPost(client, target);
      await client.deletePost(existing.id);
      printSuccess(
        opts,
        { transport: client.transport, deleted: { id: existing.id, slug: existing.slug } },
        () => {
          console.log(`Deleted post #${existing.id} (${existing.slug})`);
        }
      );
      return 0;
    }

    default:
      throw new CliError(
        'UNKNOWN_SUBCOMMAND',
        `Unknown post subcommand "${subcommand || ''}". Use: list, get, template, validate, create, update, pull, push, submit, review, translate, reorder, delete.`,
        2
      );
  }
}
