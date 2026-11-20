#!/usr/bin/env node
import { parseCliArgs } from './args.ts';
import { handleAuthCommand } from './commands/auth.ts';
import {
  handleAgentPromptCommand,
  handleContextCommand,
  handleSchemaCommand,
  handleStatusCommand,
} from './commands/context.ts';
import { handleMediaCommand } from './commands/media.ts';
import { handlePostCommand } from './commands/posts.ts';
import { handleUserCommand } from './commands/users.ts';
import { printError, writeStdout } from './output.ts';
import { CliError, CliIo } from './types.ts';

const VERSION = '1.0.0';

function printRootHelp(): void {
  console.log(`Đắk Lắk CMS CLI v${VERSION} — Agent-Friendly Editorial & Blog Workflow CLI

Usage:
  npm run cms -- <command> [subcommand] [options]

Global Options:
  --json                 Output structured JSON ({ ok, ... }) for AI agents & scripts
  --local                Operate directly on SQLite DB without running HTTP server
  --http                 Require HTTP API mode
  --url <url>            Target CMS server URL (default: $CMS_URL or http://localhost:4000)
  --token <token>        Bearer session token (or set $CMS_TOKEN)
  --as <email>           Act as specific CMS user in --local mode (e.g. writer@daklak.travel)
  --session-file <path>  Custom session file path (default: .daklak-cms-session.json)
  --quiet, -q            Suppress human output
  --help, -h             Show help
  --version, -v          Show version

Discovery & Context Commands:
  status                 Check CMS health, active actor, and post counts
  context                Fetch editorial inventory, categories, locations, and schema
  schema                 Print CMS schema, presets, and Markdown frontmatter spec
  agent-prompt           Print a ready-to-use workflow prompt for AI agents

Auth Commands:
  auth login             Sign in (--email, --password) and save session token
  auth whoami            Show currently authenticated user & transport mode
  auth logout            Revoke session and remove local session file

Post Workflow Commands:
  post template          Generate a Markdown + frontmatter draft template
  post list              List posts (--section, --status, --q, --public, --lang, --limit)
  post get <id|slug>     Inspect a single post (--public, --lang)
  post validate <target> Validate a local .md/.json file or CMS post (--strict)
  post create            Create a post (--file, --stdin, or flags; --upload-media, --dry-run)
  post update <id|slug>  Update a post (--file, --stdin, or flags; --upload-media, --dry-run)
  post pull <id|slug>    Export a CMS post to Markdown or JSON (--bilingual, --out)
  post push <file>       Upsert a post from .md/.json (--upload-media, --submit, --publish)
  post submit <id|slug>  Submit a draft for Admin review (draft -> in_review)
  post review <id|slug>  Admin review (--action publish|return_draft|unpublish, --note)
  post translate <id|slug>
                         Auto-translate (--auto) or push AI-authored EN (--file / flags)
  post reorder           Reorder section posts (--section bento|stories --ids 1,2,3)
  post delete <id|slug>  Delete a post (requires --yes)

Media & Users:
  media upload <file>    Upload an image (JPG/PNG/WebP/GIF, max 5MB) -> /uploads/...
  user list              List CMS users (Admin)
  user create            Create CMS user (--email, --name, --password, --role)
  user update <id>       Update user (--active true|false, --role writer|admin)
`);
}

function printCommandHelp(topic: string): void {
  switch (topic) {
    case 'post':
      console.log(`Post Commands:
  post template [--section stories|bento] [--theme coffee|culture|nature|cuisine] [--title "..."] [--bilingual] [--out file.md]
  post list     [--section bento|stories] [--status draft|in_review|published] [--q text] [--public] [--lang vi|en] [--limit N]
  post get      <id-or-slug> [--public] [--lang vi|en]
  post validate <file-or-id-or-slug> [--strict]
  post create   [--file post.md|post.json | --stdin | --title "..." --excerpt "..." --body-file body.md] [--upload-media] [--dry-run]
  post update   <id-or-slug> [--file post.md|post.json | --stdin | flags...] [--upload-media] [--dry-run]
  post pull     <id-or-slug> [--format md|json] [--bilingual] [--lang vi|en] [--out file.md]
  post push     <file.md|file.json> [--id N] [--upload-media] [--submit] [--publish] [--dry-run]
  post submit   <id-or-slug>
  post review   <id-or-slug> --action publish|return_draft|unpublish [--note "feedback"]
  post translate <id-or-slug> [--auto | --file en.md|en.json | --title-en "..." --excerpt-en "..." --body-file en.md --provider ai-agent]
  post reorder  --section bento|stories --ids 1,2,3
  post delete   <id-or-slug> --yes
`);
      return;
    case 'auth':
      console.log(`Auth Commands:
  auth login --email <email> --password <password>
  auth whoami
  auth logout
`);
      return;
    case 'media':
      console.log(`Media Commands:
  media upload <path-to-image>
`);
      return;
    case 'user':
      console.log(`User Commands (Admin only):
  user list
  user create --email <email> --name <displayName> --password <pass> [--role writer|admin]
  user update <id> [--active true|false] [--role writer|admin]
`);
      return;
    default:
      printRootHelp();
  }
}

export async function runCli(argv: string[], io?: CliIo): Promise<number> {
  const { positionals, flags, global } = parseCliArgs(argv);
  if (io) global.io = io;

  try {
    if (flags.version && positionals.length === 0) {
      if (global.json) {
        writeStdout(global, JSON.stringify({ ok: true, version: VERSION }) + '\n');
      } else {
        writeStdout(global, `daklak-cms v${VERSION}\n`);
      }
      return 0;
    }

    const [cmd, subcmd, ...rest] = positionals;
    if (!cmd || (flags.help && !cmd)) {
      printRootHelp();
      return 0;
    }

    if (flags.help) {
      printCommandHelp(cmd);
      return 0;
    }

    switch (cmd) {
      case 'status':
      case 'health':
        await handleStatusCommand(global);
        return 0;
      case 'context':
        await handleContextCommand(flags, global);
        return 0;
      case 'schema':
        handleSchemaCommand(global);
        return 0;
      case 'agent-prompt':
        handleAgentPromptCommand(flags, global);
        return 0;
      case 'auth':
        await handleAuthCommand(subcmd, flags, global);
        return 0;
      case 'post':
      case 'posts':
        return await handlePostCommand(subcmd, rest, flags, global);
      case 'media':
        await handleMediaCommand(subcmd, rest, global);
        return 0;
      case 'user':
      case 'users':
        await handleUserCommand(subcmd, rest, flags, global);
        return 0;
      default:
        throw new CliError(
          'UNKNOWN_COMMAND',
          `Unknown command "${cmd}". Run "npm run cms -- --help" to see available commands.`,
          2
        );
    }
  } catch (err) {
    return printError(global, err);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('cli/index.ts') || process.argv[1].endsWith('cli\\index.ts'));

if (isMain) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
