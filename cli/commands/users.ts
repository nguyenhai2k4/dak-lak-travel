import { getStringFlag, requireStringFlag } from '../args.ts';
import { resolveClient } from '../client.ts';
import { printSuccess } from '../output.ts';
import { CliError, CliGlobalOptions } from '../types.ts';

export async function handleUserCommand(
  subcommand: string | undefined,
  positionals: string[],
  flags: Record<string, string | boolean>,
  opts: CliGlobalOptions
): Promise<void> {
  const client = await resolveClient(opts);

  switch (subcommand) {
    case 'list': {
      const users = await client.listUsers();
      printSuccess(opts, { transport: client.transport, users }, () => {
        for (const u of users) {
          console.log(
            `#${u.id} [${u.role}] ${u.email} — ${u.displayName} (${u.isActive ? 'active' : 'inactive'})`
          );
        }
      });
      return;
    }

    case 'create': {
      const email = requireStringFlag(flags, 'email');
      const displayName = getStringFlag(flags, 'name') || requireStringFlag(flags, 'display-name');
      const password = requireStringFlag(flags, 'password');
      const roleRaw = getStringFlag(flags, 'role') || 'writer';
      const role = roleRaw === 'admin' ? 'admin' : 'writer';

      const user = await client.createUser({ email, displayName, password, role });
      printSuccess(opts, { transport: client.transport, user }, () => {
        console.log(`Created user #${user.id}: ${user.email} (${user.role})`);
      });
      return;
    }

    case 'update': {
      const id = Number(positionals[0]);
      if (!Number.isInteger(id)) {
        throw new CliError('MISSING_ARG', 'Provide numeric user ID: cms user update <id> ...', 2);
      }
      const payload: { isActive?: boolean; role?: 'admin' | 'writer' } = {};
      if (flags.active !== undefined) {
        const v = flags.active;
        payload.isActive = v === true || v === 'true' || v === '1';
      }
      const roleRaw = getStringFlag(flags, 'role');
      if (roleRaw === 'admin' || roleRaw === 'writer') {
        payload.role = roleRaw;
      }

      const user = await client.updateUser(id, payload);
      printSuccess(opts, { transport: client.transport, user }, () => {
        console.log(
          `Updated user #${user.id}: ${user.email} (role=${user.role}, active=${user.isActive})`
        );
      });
      return;
    }

    default:
      throw new CliError(
        'UNKNOWN_SUBCOMMAND',
        `Unknown user subcommand "${subcommand || ''}". Use: list, create, update.`,
        2
      );
  }
}
