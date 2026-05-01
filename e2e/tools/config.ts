import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDotEnvFiles } from '@pcg/dotenv-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(path.resolve(__dirname, '..'), '.env.yml');

const raw = parseDotEnvFiles([{ path: envFile }]);

function str(key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`e2e config: ${key} is missing in ${envFile}`);
  }
  return value;
}

export const URLS = {
  api: str('API_URL'),
  admin: str('APP_URL'),
} as const;

export const API_GQL_URL = `${URLS.api}/graphql`;

export const HOSTS = {
  api: new URL(URLS.api).host,
  admin: new URL(URLS.admin).host,
} as const;
