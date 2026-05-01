import { registerAs } from '@nestjs/config';
import { IsString } from 'class-validator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateEnv } from '@/tools/validate-env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Mailer config environment variables
 */
class MailerConfigEnvironmentVariables {
  /**
   * Default sender name
   * @example
   * ```yaml
   * EMAIL_DEFAULT_FROM_NAME: 'TrustLoop App'
   * ```
   */
  @IsString()
  EMAIL_DEFAULT_FROM_NAME!: string;

  /**
   * Default sender email address
   * @example
   * ```yaml
   * EMAIL_DEFAULT_FROM_ADDRESS: 'noreply@ugi.dev'
   * ```
   */
  @IsString()
  EMAIL_DEFAULT_FROM_ADDRESS!: string;
}

export const MailerConfig = registerAs('mailer', () => {
  const env = validateEnv(MailerConfigEnvironmentVariables);

  return {
    defaultFrom: {
      name: env.EMAIL_DEFAULT_FROM_NAME,
      email: env.EMAIL_DEFAULT_FROM_ADDRESS,
    },
    templatesDir: path.resolve(__dirname, '../resources/emails/'),
  };
});
