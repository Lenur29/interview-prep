import { registerAs } from '@nestjs/config';
import { IsString } from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';
import { type Secret, type SignOptions } from 'jsonwebtoken';

class JwtEnvironmentVariables {
  @IsString()
  JWT_SECRET!: string;
}

export const JwtConfig = registerAs('jwt', () => {
  const env = validateEnv(JwtEnvironmentVariables);

  const secret: Secret = env.JWT_SECRET;

  const expiration: Record<string, SignOptions['expiresIn']> = {
    serviceAccountAccessToken: '1 Year',
    inviteToken: '2 Years',
    subscriptionToken: '1 Year',
    telegramWebappToken: '1h',
  };

  return {
    secret,
    iss: 'ugi',
    aud: ['ugi'],
    expiration,
  };
});
