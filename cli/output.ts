import { CliError, CliGlobalOptions } from './types.ts';

export function writeStdout(opts: CliGlobalOptions, text: string): void {
  if (opts.io) {
    opts.io.stdout(text);
  } else {
    process.stdout.write(text);
  }
}

export function writeStderr(opts: CliGlobalOptions, text: string): void {
  if (opts.io) {
    opts.io.stderr(text);
  } else {
    process.stderr.write(text);
  }
}

export function printSuccess(
  opts: CliGlobalOptions,
  data: Record<string, unknown>,
  humanFormatter: () => void
): void {
  if (opts.json) {
    writeStdout(opts, JSON.stringify({ ok: true, ...data }, null, 2) + '\n');
    return;
  }
  if (!opts.quiet) {
    humanFormatter();
  }
}

export function printError(opts: CliGlobalOptions, err: unknown): number {
  const cliErr =
    err instanceof CliError
      ? err
      : new CliError('INTERNAL_ERROR', err instanceof Error ? err.message : String(err), 1);

  if (opts.json) {
    writeStderr(
      opts,
      JSON.stringify(
        {
          ok: false,
          error: {
            code: cliErr.code,
            message: cliErr.message,
            ...(cliErr.hint ? { hint: cliErr.hint } : {}),
          },
        },
        null,
        2
      ) + '\n'
    );
  } else {
    writeStderr(opts, `Error [${cliErr.code}]: ${cliErr.message}\n`);
    if (cliErr.hint) {
      writeStderr(opts, `Hint: ${cliErr.hint}\n`);
    }
  }

  return cliErr.exitCode;
}

export function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
}
