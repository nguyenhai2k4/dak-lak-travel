import { resolveClient } from '../client.ts';
import { printSuccess } from '../output.ts';
import { CliError, CliGlobalOptions } from '../types.ts';

export async function handleMediaCommand(
  subcommand: string | undefined,
  positionals: string[],
  opts: CliGlobalOptions
): Promise<void> {
  if (subcommand !== 'upload') {
    throw new CliError(
      'UNKNOWN_SUBCOMMAND',
      `Unknown media subcommand "${subcommand || ''}". Use: upload <file>.`,
      2
    );
  }

  const filePath = positionals[0];
  if (!filePath) {
    throw new CliError('MISSING_ARG', 'Provide an image file path: cms media upload <file>', 2);
  }

  const client = await resolveClient(opts);
  const uploaded = await client.uploadImage(filePath);

  printSuccess(
    opts,
    {
      transport: client.transport,
      ...uploaded,
    },
    () => {
      console.log(`Uploaded -> ${uploaded.url} (file: ${uploaded.filename})`);
    }
  );
}
