import { createCommand } from 'commander';

import { seedCmd } from './seed.js';

export const dbCmd = createCommand('db');
dbCmd.description('Database commands');
dbCmd.addCommand(seedCmd);
