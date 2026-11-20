import fs from 'node:fs';
import { PORT } from '../server/config.ts';
import { DEFAULT_SESSION_FILE } from './client.ts';
import { CliError, CliGlobalOptions, TransportMode } from './types.ts';

export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
  global: CliGlobalOptions;
}

export function parseCliArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  const booleanFlags = new Set([
    'json',
    'local',
    'http',
    'quiet',
    'help',
    'h',
    'version',
    'v',
    'stdin',
    'dry-run',
    'upload-media',
    'bilingual',
    'public',
    'raw',
    'strict',
    'auto',
    'submit',
    'publish',
    'yes',
    'y',
    'retranslate',
    'is-culture-highlight',
  ]);

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
        i += 1;
        continue;
      }

      const key = arg.slice(2);
      if (key.startsWith('no-')) {
        flags[key.slice(3)] = false;
        i += 1;
        continue;
      }

      if (booleanFlags.has(key)) {
        flags[key] = true;
        i += 1;
        continue;
      }

      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i += 1;
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      const short = arg.slice(1);
      if (short === 'h') flags.help = true;
      else if (short === 'v') flags.version = true;
      else if (short === 'j') flags.json = true;
      else if (short === 'y') flags.yes = true;
      else if (short === 'q') flags.quiet = true;
      else flags[short] = argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : true;
      i += 1;
      continue;
    }

    positionals.push(arg);
    i += 1;
  }

  let mode: TransportMode = 'auto';
  if (flags.local) mode = 'local';
  else if (flags.http || flags.url) mode = 'http';
  else if (process.env.CMS_MODE === 'local' || process.env.CMS_MODE === 'http') {
    mode = process.env.CMS_MODE;
  }

  const defaultUrl = process.env.CMS_URL || `http://localhost:${PORT}`;
  const url = typeof flags.url === 'string' ? flags.url : defaultUrl;
  const sessionFile =
    typeof flags['session-file'] === 'string'
      ? flags['session-file']
      : process.env.CMS_SESSION_FILE || DEFAULT_SESSION_FILE;

  const global: CliGlobalOptions = {
    json: Boolean(flags.json),
    mode,
    url,
    token: typeof flags.token === 'string' ? flags.token : undefined,
    as: typeof flags.as === 'string' ? flags.as : undefined,
    sessionFile,
    quiet: Boolean(flags.quiet),
  };

  return { positionals, flags, global };
}

export function getStringFlag(
  flags: Record<string, string | boolean>,
  name: string
): string | undefined {
  const val = flags[name];
  if (typeof val === 'string') return val;
  return undefined;
}

export function getBoolFlag(flags: Record<string, string | boolean>, name: string): boolean {
  const val = flags[name];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true' || val === '1' || val === 'yes';
  return false;
}

export function requireStringFlag(
  flags: Record<string, string | boolean>,
  name: string,
  hint?: string
): string {
  const val = getStringFlag(flags, name);
  if (!val || !val.trim()) {
    throw new CliError('MISSING_FLAG', `Missing required flag --${name}.`, 2, hint);
  }
  return val.trim();
}

export async function readStdinText(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new CliError('EMPTY_STDIN', 'No stdin input provided.', 2);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function readInputFileText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new CliError('FILE_NOT_FOUND', `Input file not found: ${filePath}`, 2);
  }
  return fs.readFileSync(filePath, 'utf8');
}
