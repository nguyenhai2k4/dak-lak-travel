import { getStringFlag } from '../args.ts';
import { EDITORIAL_GUIDELINES, EDITORIAL_SCHEMA, resolveClient } from '../client.ts';
import { printSuccess, truncate } from '../output.ts';
import { CliError, CliGlobalOptions } from '../types.ts';
import { CmsSectionType } from '../../src/types/index.ts';

export async function handleStatusCommand(opts: CliGlobalOptions): Promise<void> {
  const client = await resolveClient(opts);
  const health = await client.health();
  const actor = await client.getActor().catch(() => null);
  const context = actor || client.transport === 'local' ? await client.getContext() : null;

  printSuccess(
    opts,
    {
      ...health,
      user: actor,
      counts: context?.counts || null,
    },
    () => {
      console.log(`CMS Status: ${health.ok ? 'OK' : 'DOWN'} (${health.transport} -> ${health.target})`);
      console.log(
        `Actor: ${actor ? `${actor.displayName} <${actor.email}> (${actor.role})` : 'unauthenticated'}`
      );
      if (context) {
        console.log(
          `Posts: total=${context.counts.total} | published=${context.counts.byStatus.published} | in_review=${context.counts.byStatus.in_review} | draft=${context.counts.byStatus.draft}`
        );
        console.log(
          `Sections: bento=${context.counts.bySection.bento} | stories=${context.counts.bySection.stories}`
        );
      }
    }
  );
}

export async function handleContextCommand(
  flags: Record<string, string | boolean>,
  opts: CliGlobalOptions
): Promise<void> {
  const sectionRaw = getStringFlag(flags, 'section');
  const section: CmsSectionType | undefined =
    sectionRaw === 'bento' || sectionRaw === 'stories' ? sectionRaw : undefined;
  if (sectionRaw && !section) {
    throw new CliError('VALIDATION_ERROR', `Invalid --section "${sectionRaw}". Use bento or stories.`, 2);
  }

  const client = await resolveClient(opts);
  const context = await client.getContext(section);

  printSuccess(
    opts,
    {
      transport: client.transport,
      context,
    },
    () => {
      console.log(`=== Đắk Lắk CMS Editorial Context (${client.transport}) ===`);
      console.log(
        `Counts: total=${context.counts.total} (published=${context.counts.byStatus.published}, in_review=${context.counts.byStatus.in_review}, draft=${context.counts.byStatus.draft})`
      );
      console.log(`Categories: ${context.categories.join(', ') || '(none)'}`);
      console.log(`Locations: ${context.locations.join(', ') || '(none)'}`);
      console.log('\nExisting Posts:');
      for (const p of context.existingPosts) {
        console.log(
          `  #${p.id} [${p.section}/${p.themeKey}] (${p.status}) ${p.slug} — ${truncate(p.title, 60)}`
        );
      }
      console.log('\nGuidelines:');
      for (const g of context.editorialGuidelines) {
        console.log(`  - ${g}`);
      }
    }
  );
}

export function handleSchemaCommand(opts: CliGlobalOptions): void {
  const payload = {
    schema: EDITORIAL_SCHEMA,
    editorialGuidelines: EDITORIAL_GUIDELINES,
    markdownFrontmatterFormat: {
      delimiters: '--- ... ---',
      bilingualSeparator: '<!-- LANG:EN -->',
      supportedBodyBlocks: ['headings (h1-h4)', 'paragraphs', 'lists', 'blockquotes', 'code', 'links', 'images', 'hr'],
    },
  };

  printSuccess(opts, payload, () => {
    console.log('=== Đắk Lắk CMS Schema ===');
    console.log(`Sections: ${EDITORIAL_SCHEMA.sections.join(', ')}`);
    console.log(`Themes: ${EDITORIAL_SCHEMA.themes.join(', ')}`);
    console.log(`Statuses: ${EDITORIAL_SCHEMA.statuses.join(' -> ')}`);
    console.log(`Required fields: ${EDITORIAL_SCHEMA.requiredFields.join(', ')}`);
    console.log(`Story gradients: ${EDITORIAL_SCHEMA.storyGradients.map((g) => `${g.value} (${g.label})`).join(', ')}`);
    console.log('Bilingual Markdown: separate VI and EN sections with <!-- LANG:EN -->');
  });
}

export function handleAgentPromptCommand(
  flags: Record<string, string | boolean>,
  opts: CliGlobalOptions
): void {
  const role = getStringFlag(flags, 'role') || 'writer';
  const prompt = [
    `# AI Agent CMS Workflow Guide (Role: ${role})`,
    '',
    'You are collaborating on the Đắk Lắk Travel Blog CMS via `npm run cms --`.',
    'Always pass `--json` when parsing command outputs programmatically.',
    '',
    '## Step-by-step Workflow',
    '1. Inspect current editorial inventory & avoid duplicate topics:',
    '   `npm run cms -- context --json`',
    '2. Scaffold a Markdown draft (use `--bilingual` to author VI + EN together):',
    '   `npm run cms -- post template --section stories --theme coffee --bilingual --out draft.md`',
    '3. Write the article in `draft.md` (frontmatter + Markdown body; optionally `<!-- LANG:EN -->` for English).',
    '4. Validate quality, word count, image paths, and schema before saving:',
    '   `npm run cms -- post validate draft.md --json`',
    '5. Create or update the post (add `--upload-media` if referencing local images):',
    '   `npm run cms -- post push draft.md --upload-media --json`',
    role === 'writer'
      ? '6. Submit draft for Admin editorial review:\n   `npm run cms -- post submit <id-or-slug> --json`'
      : '6. Review, supply/verify English translation, and publish:\n   `npm run cms -- post translate <id-or-slug> --file draft.md --json`\n   `npm run cms -- post review <id-or-slug> --action publish --json`',
    '',
    'Tip: Use `npm run cms -- post pull <id-or-slug> --bilingual --out post.md` to edit or translate existing posts cleanly.',
  ].join('\n');

  printSuccess(opts, { role, prompt }, () => {
    console.log(prompt);
  });
}
