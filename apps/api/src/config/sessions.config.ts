import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';

class SessionsEnvironmentVariables {
  @IsOptional()
  @IsString()
  SESSION_MAX_AGE?: string;

  @IsOptional()
  @IsString()
  SESSION_SLIDING_WINDOW?: string;
}

export const SessionsConfig = registerAs('sessions', () => {
  const env = validateEnv(SessionsEnvironmentVariables);

  return {
    /**
     * Maximum session lifetime
     * @default '30 Days'
     */
    maxAge: env.SESSION_MAX_AGE ?? '30 Days',

    /**
     * Sliding window - extend session on activity within this period
     * @default '15 Minutes'
     */
    slidingWindow: env.SESSION_SLIDING_WINDOW ?? '15 Minutes',
  };
});
