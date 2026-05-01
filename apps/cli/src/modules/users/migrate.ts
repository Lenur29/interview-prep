import {
  type CommandArgsWithEnv,
  createKnexClient,
  useLogger,
} from '@pcg/cli-tools';
import { createCommand } from 'commander';

import type { LemurEnv } from '../../tools/env.js';

interface MigrateOptions {
  fromEnv: LemurEnv;
  toEnv: LemurEnv;
  dryRun: boolean;
}

// Only columns that exist in the target schema (based on user.entity.ts).
// full_name is excluded — it's a STORED generated column computed by Postgres.
const TARGET_COLUMNS = [
  'id',
  'status',
  'type',
  'first_name',
  'last_name',
  'email',
  'password_hash',
  'permissions',
  'invite_token',
  'is_2fa_enabled',
  'is_otp_enabled',
  'otp_secret',
  'created_at',
  'updated_at',
  'fcm_token',
  'push_notifications_enabled',
  'phone_number',
] as const;

type UserRow = Record<(typeof TARGET_COLUMNS)[number], unknown>;

const JSONB_COLUMNS = new Set(['permissions']);

function pickTargetColumns(row: Record<string, unknown>, raw: (sql: string, bindings: unknown[]) => unknown): UserRow {
  const result: Record<string, unknown> = {};
  for (const col of TARGET_COLUMNS) {
    if (col in row) {
      const value = row[col];
      result[col] = JSONB_COLUMNS.has(col) && value !== null && value !== undefined
        ? raw('?::jsonb', [JSON.stringify(value)])
        : value;
    }
  }
  return result as UserRow;
}

export const migrateCmd = createCommand('migrate')
  .description('Migrate all users from one environment database to another')
  .requiredOption('--from-env <env>', 'Source environment (local, dev, stage, prod)')
  .requiredOption('--to-env <env>', 'Target environment (local, dev, stage, prod)')
  .option('--dry-run', 'Preview what would be migrated without writing to target DB', false)
  .action(async (options: MigrateOptions) => {
    const logger = useLogger({ name: 'users:migrate' });

    logger.info(`🚀 Migrating all users from [${options.fromEnv}] → [${options.toEnv}]`);

    if (options.dryRun) {
      logger.info('⚠️  Dry-run mode — no changes will be written to the target database\n');
    }

    const fromKnex = await createKnexClient({ env: options.fromEnv as CommandArgsWithEnv['env'] });
    const toKnex = await createKnexClient({ env: options.toEnv as CommandArgsWithEnv['env'] });

    try {
      await fromKnex.raw('SELECT 1');
      logger.info(`🔌 Connected to source DB (${options.fromEnv})`);

      await toKnex.raw('SELECT 1');
      logger.info(`🔌 Connected to target DB (${options.toEnv})\n`);

      const sourceUsers = await fromKnex('users').select('*') as Record<string, unknown>[];

      if (sourceUsers.length === 0) {
        logger.info('🚫 No users found in source database');
        return;
      }

      logger.info(`📦 Found ${sourceUsers.length} user(s) in source database\n`);

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const raw of sourceUsers) {
        const user = pickTargetColumns(raw, toKnex.raw.bind(toKnex));
        const id = raw['id'] as string;
        const email = raw['email'] as string;
        const firstName = raw['first_name'] as string;
        const lastName = raw['last_name'] as string;

        const existing = await toKnex('users').where('id', id).first<{ id: string } | undefined>();
        const emailConflict = !existing
          ? await toKnex('users').where('email', email).whereNot('id', id).first<{ id: string } | undefined>()
          : null;

        if (emailConflict) {
          logger.info(`  ⚠️  Skipped ${id} — email "${email}" already used by another record`);
          skipped++;
          continue;
        }

        if (options.dryRun) {
          if (existing) {
            logger.info(`  ✏️  [dry-run] Would update ${id} — ${firstName} ${lastName} (${email})`);
            updated++;
          } else {
            logger.info(`  ➕ [dry-run] Would insert ${id} — ${firstName} ${lastName} (${email})`);
            inserted++;
          }
          continue;
        }

        if (existing) {
          await toKnex('users').where('id', id).update(user);
          logger.info(`  ✏️  Updated ${id} — ${firstName} ${lastName} (${email})`);
          updated++;
        } else {
          await toKnex('users').insert(user);
          logger.info(`  ➕ Inserted ${id} — ${firstName} ${lastName} (${email})`);
          inserted++;
        }
      }

      logger.info(`\n✅ Migration complete (${sourceUsers.length} total):`);
      logger.info(`   ➕ Inserted: ${inserted}`);
      logger.info(`   ✏️  Updated:  ${updated}`);
      logger.info(`   ⚠️  Skipped:  ${skipped}`);
    } finally {
      await fromKnex.destroy();
      await toKnex.destroy();
    }
  });
