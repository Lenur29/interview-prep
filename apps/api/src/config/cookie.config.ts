import { registerAs } from '@nestjs/config';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import type { CookieOptions } from 'express';

import { validateEnv } from '@/tools/validate-env.js';

export enum CookieSameSite {
  STRICT = 'strict',
  LAX = 'lax',
  NONE = 'none',
}

export const COOKIE_NAMES = {
  session: 'tl_session',
  subscriptionToken: 'tl_subscription_token',
} as const;

class CookieEnvironmentVariables {
  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  COOKIE_SECURE?: boolean;

  @IsOptional()
  @IsEnum(CookieSameSite)
  COOKIE_SAME_SITE?: CookieSameSite;
}

export interface AuthCookieOptions extends Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite' | 'domain' | 'path'> {
  httpOnly: boolean;
  secure: boolean;
  sameSite: CookieOptions['sameSite'];
  domain: string | undefined;
  path: string;
}

export const CookieConfig = registerAs('cookie', () => {
  const env = validateEnv(CookieEnvironmentVariables);

  const domain = env.COOKIE_DOMAIN;
  const secure = env.COOKIE_SECURE ?? true;
  const sameSite = env.COOKIE_SAME_SITE ?? CookieSameSite.LAX;

  const getBaseOptions = (): AuthCookieOptions => ({
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
  });

  const getSubscriptionCookieOptions = (): AuthCookieOptions => ({
    ...getBaseOptions(),
    httpOnly: false, // JS needs access for WebSocket connectionParams
  });

  return {
    domain,
    secure,
    sameSite,
    names: COOKIE_NAMES,
    getBaseOptions,
    getSubscriptionCookieOptions,
  };
});
