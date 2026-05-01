import { registerAs } from '@nestjs/config';
import { IsString } from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';

/**
 * Service account config environment variables
 */
export class ServiceAccountEnvironmentVariables {
  /**
   * Service account ID that the application will use
   * @example
   * ```yaml
   * APP_SERVICE_ACCOUNT_ID: tlsa:app
   * ```
   */
  @IsString()
  APP_SERVICE_ACCOUNT_ID!: string;

  /**
   * Email domain for service accounts. Used to construct email as {alias}@{emailDomain}
   * @example
   * ```yaml
   * SERVICE_ACCOUNT_EMAIL_DOMAIN: serviceaccount.trustloop.dev
   * ```
   */
  @IsString()
  SERVICE_ACCOUNT_EMAIL_DOMAIN!: string;
}

export const ServiceAccountsConfig = registerAs('serviceAccounts', () => {
  const env = validateEnv(ServiceAccountEnvironmentVariables);

  return {
    id: env.APP_SERVICE_ACCOUNT_ID,
    emailDomain: env.SERVICE_ACCOUNT_EMAIL_DOMAIN,
  };
});
