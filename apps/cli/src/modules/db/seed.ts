import {
  type CommandArgsWithEnv,
  createCommandWithEnv,
  getConfig,
  useLogger,
} from '@pcg/cli-tools';
import knex from 'knex';
import { hash } from 'bcrypt';

// Test password for all users (min 12 chars, uppercase, lowercase, numbers, symbols)
const TEST_PASSWORD = '7BAV3HzJ3Pr_WqqZpX2x';

interface SeedOptions extends CommandArgsWithEnv {
  clean: boolean;
}

export const seedCmd = createCommandWithEnv('seed')
  .description('Seed database with initial data')
  .option('--clean', 'Clean database before seeding', false)
  .action(async (options: SeedOptions) => {
    const logger = useLogger({ name: 'db:seed' });

    logger.info(`🌱 Seeding database in ${options.env} environment`);

    const config = await getConfig();
    const dbConfig = config.database[options.env];
    const useSSL = options.env !== 'local';

    const db = knex({
      client: 'pg',
      connection: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.pass,
        database: dbConfig.db,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      },
    });

    try {
      await db.raw('SELECT 1');
      logger.info('🔌 Connected to database\n');

      if (options.clean) {
        logger.info('🧹 Cleaning database...');
        await db.raw(`
          TRUNCATE TABLE
            password_recovery_requests,
            service_tokens,
            sessions,
            user_roles,
            image_renditions,
            images,
            files,
            users
          CASCADE
        `);
        logger.info('   ✅ Database cleaned\n');
      }

      const now = new Date().toISOString();
      const passwordHash = await hash(TEST_PASSWORD, 10);

      logger.info('👤 Creating superadmin...');

      await db('users').insert({
        id: 'u:superadmin',
        status: 'ACTIVE',
        type: 'SA',
        first_name: 'Super',
        last_name: 'Admin',
        email: 'superadmin@lemur.test',
        password_hash: passwordHash,
        permissions: JSON.stringify([]),
        push_notifications_enabled: false,
        created_at: now,
        updated_at: now,
      });

      await db('user_roles').insert({
        id: 'ur:superadmin',
        user_id: 'u:superadmin',
        role_id: 'SUPERADMIN',
        created_at: now,
        updated_at: now,
      });

      logger.info('   ✅ superadmin@lemur.test (SUPERADMIN)');

      logger.info('\n✅ Database seeded successfully!');
      logger.info('\n🔐 Test credentials:');
      logger.info('   Email: superadmin@lemur.test');
      logger.info(`   Password: ${TEST_PASSWORD}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        logger.error('❌ Cannot connect to database. Is it running?');
      } else {
        logger.error('❌ Failed to seed database:');
        if (error instanceof Error) {
          logger.error(`   Message: ${error.message}`);
          if (error.stack) {
            logger.error(`   Stack: ${error.stack}`);
          }
        } else {
          logger.error(`   Error: ${String(error)}`);
        }
      }
      process.exit(1);
    } finally {
      await db.destroy();
    }
  });
