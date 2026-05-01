import { createCommand } from 'commander';

import { migrateCmd } from './migrate.js';

export const usersCmd = createCommand('users');
usersCmd.description('Users management commands');
usersCmd.addCommand(migrateCmd);
