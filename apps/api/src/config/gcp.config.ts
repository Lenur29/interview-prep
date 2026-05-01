import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';

export class GcpConfigEnvironmentVariables {
  @IsString()
  GCP_PROJECT_ID!: string;

  /**
   * Base64-encoded service account JSON.
   * If set, takes precedence over GOOGLE_APPLICATION_CREDENTIALS.
   */
  @IsString()
  @IsOptional()
  GCP_SERVICE_ACCOUNT_KEY_BASE64?: string;

  /**
   * Path to a service account JSON file.
   * Standard Google env var — picked up automatically by applicationDefault().
   */
  @IsString()
  @IsOptional()
  GOOGLE_APPLICATION_CREDENTIALS?: string;
}

export interface GcpServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  [key: string]: unknown;
}

export const GcpConfig = registerAs('gcp', () => {
  const env = validateEnv(GcpConfigEnvironmentVariables);

  let serviceAccountKey: GcpServiceAccountKey | undefined;

  if (env.GCP_SERVICE_ACCOUNT_KEY_BASE64) {
    const decoded = Buffer.from(env.GCP_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
    serviceAccountKey = JSON.parse(decoded) as GcpServiceAccountKey;
  }

  return {
    projectId: env.GCP_PROJECT_ID,
    serviceAccountKey,
  };
});
