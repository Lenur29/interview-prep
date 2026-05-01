# Trustloop CLI

CLI utility for experiments and testing.

## Usage

```bash
trustloop <command> [options]
```

## Command Structure

Commands are organized into modules in `src/modules/`:

```
src/
├── cli.ts                    # Entry point
└── modules/
    └── test/                 # test module
        ├── index.ts          # Subcommand registration
        └── hello.ts          # hello command
```

### Available Commands

- `trustloop test hello` — test command
- `trustloop users search -q <query>` — search users by name or email

## Adding a New Command

1. Create a command file in the appropriate module:

```typescript
// src/modules/test/my-command.ts
import { createCommand } from 'commander';

export const myCmd = createCommand('my-command')
  .description('Command description')
  .option('-f, --flag', 'Flag description')
  .action(async (options) => {
    // implementation
  });
```

1. Register it in the module's `index.ts`:

```typescript
import { myCmd } from './my-command.js';
testCmd.addCommand(myCmd);
```

## Adding a New Module

1. Create a directory `src/modules/<module-name>/`
2. Create `index.ts` with the module command export
3. Register it in `src/cli.ts`:

```typescript
import { newModuleCmd } from './modules/<module-name>/index.js';
program.addCommand(newModuleCmd);
```

## Database Commands

For commands that work with the database, use utilities from `@pcg/cli-tools`.

### Database Command Example

```typescript
// src/modules/users/search.ts
import {
  CommandArgsWithEnv,
  createCommandWithEnv,
  createKnexClient,
  useLogger,
} from '@pcg/cli-tools';

interface SearchOptions extends CommandArgsWithEnv {
  query: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
}

export const searchCmd = createCommandWithEnv('search')
  .description('Search users by fullName or email')
  .requiredOption('-q, --query <query>', 'Search query')
  .action(async (options: SearchOptions) => {
    const logger = useLogger({ name: 'users:search' });

    logger.info(`🔍 Searching users with query: "${options.query}" in ${options.env}`);

    const knex = await createKnexClient({ env: options.env });

    try {
      const users = await knex('users')
        .where('full_name', 'ilike', `%${options.query}%`)
        .orWhere('email', 'ilike', `%${options.query}%`)
        .select<User[]>('id', 'full_name', 'email');

      if (users.length === 0) {
        logger.info('🚫 No users found');
      } else {
        logger.info(`✅ Found ${users.length} user(s):`);
        for (const user of users) {
          logger.info(`  👤 ${user.full_name} (${user.email})`);
        }
      }
    } finally {
      await knex.destroy();
    }
  });
```

### Key Points

1. **createCommandWithEnv** — creates a command with the `--env` option (local, dev, stage, prod)
2. **CommandArgsWithEnv** — interface for typing command options with env
3. **createKnexClient** — creates a Knex client for the specified environment
4. **useLogger** — creates a logger with colored output
5. **knex.destroy()** — always close the connection in `finally`

### Using Emoji in Logs

Examples:

- 🔍 — search, operation start
- ✅ — success
- 🚫 — not found, empty
- ❌ — error
- 👤 — user
- 📦 — data, object
- ⏳ — waiting, in progress
- 💾 — saving

## Development

```bash
pnpm dev    # Watch mode
pnpm build  # Build
```
