import { AppEnv } from '@/enums/app-env.enum.js';
import { useDotEnv } from '@pcg/dotenv-yaml';
import path from 'node:path';

if (process.env.APP_ENV === AppEnv.LOCAL) {
  useDotEnv([
    {
      path: path.join(process.cwd(), '.env.yml'),
    },
  ]);
}

export { AppConfig } from './app.config.js';
export { CookieConfig } from './cookie.config.js';
export { DbConfig } from './db.config.js';
export { JwtConfig } from './jwt.config.js';
export { LoggerConfig } from './logger.config.js';
export { ServiceAccountsConfig } from './service-accounts.config.js';
export { FrontendConfig } from './frontend.config.js';
export { MailerConfig } from './mailer.config.js';
export { MailpitConfig } from './mailpit.config.js';
export { SessionsConfig } from './sessions.config.js';
export { GcpConfig } from './gcp.config.js';
export { S3Config } from './s3.config.js';
export { OpenAIConfig } from './openai.config.js';
