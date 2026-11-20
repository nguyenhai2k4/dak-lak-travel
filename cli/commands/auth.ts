import { getStringFlag, requireStringFlag } from '../args.ts';
import { readSessionFile, resolveClient } from '../client.ts';
import { printSuccess } from '../output.ts';
import { CliError, CliGlobalOptions } from '../types.ts';

export async function handleAuthCommand(
  subcommand: string | undefined,
  flags: Record<string, string | boolean>,
  opts: CliGlobalOptions
): Promise<void> {
  const client = await resolveClient(opts);

  switch (subcommand) {
    case 'login': {
      const email =
        getStringFlag(flags, 'email') ||
        process.env.CMS_EMAIL ||
        requireStringFlag(flags, 'email', 'Pass --email <email> or set CMS_EMAIL.');
      const password =
        getStringFlag(flags, 'password') ||
        process.env.CMS_PASSWORD ||
        requireStringFlag(flags, 'password', 'Pass --password <password> or set CMS_PASSWORD.');

      const session = await client.login(email, password);
      printSuccess(
        opts,
        {
          transport: client.transport,
          target: client.target,
          user: session.user,
          sessionFile: opts.sessionFile,
        },
        () => {
          console.log(
            `Logged in as ${session.user?.displayName} (${session.user?.email}, role: ${session.user?.role}) [${client.transport}]`
          );
          console.log(`Session saved to ${opts.sessionFile}`);
        }
      );
      return;
    }

    case 'logout': {
      await client.logout();
      printSuccess(opts, { transport: client.transport, loggedOut: true }, () => {
        console.log('Logged out and cleared local session.');
      });
      return;
    }

    case 'whoami': {
      const actor = await client.getActor();
      const saved = readSessionFile(opts.sessionFile);
      printSuccess(
        opts,
        {
          transport: client.transport,
          target: client.target,
          authenticated: Boolean(actor),
          user: actor,
          sessionUrl: saved?.url || null,
        },
        () => {
          if (!actor) {
            console.log(`Not authenticated [${client.transport}: ${client.target}]`);
          } else {
            console.log(
              `${actor.displayName} <${actor.email}> (id=${actor.id}, role=${actor.role}) [${client.transport}: ${client.target}]`
            );
          }
        }
      );
      return;
    }

    default:
      throw new CliError(
        'UNKNOWN_SUBCOMMAND',
        `Unknown auth subcommand "${subcommand || ''}". Use: login, logout, whoami.`,
        2
      );
  }
}
