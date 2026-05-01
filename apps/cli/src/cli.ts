#!/usr/bin/env node
import { createCommand } from 'commander';

import { dbCmd } from './modules/db/index.js';
import { usersCmd } from './modules/users/index.js';

const program = createCommand('lm');
program
  .description('LemurJS CLI');

program.addCommand(dbCmd);
program.addCommand(usersCmd);

(async () => {
  await program.parseAsync();
})().then(() => {
  process.exit(0);
}).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
