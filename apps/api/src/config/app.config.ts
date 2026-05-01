import { registerAs } from '@nestjs/config';
import { Type } from 'class-transformer';
import {
  IsEnum, IsNumber, IsOptional,
  IsString,
} from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';

import { AppEnv } from '../enums/app-env.enum.js';
import { AppServer } from '../enums/app-server.enum.js';

/**
 * Application config environment variables
 */
export class AppConfigEnvironmentVariables {
  /**
   * Application port
   * @example
   * ```yaml
   * PORT: 6700
   * ```
   */
  @Type(() => Number)
  @IsNumber()
  PORT = 6700;

  /**
   * Application environment. Can be 'local', 'test', 'development', 'stage', 'production'
   * @example
   * ```yaml
   * APP_ENV: 'local'
   * ```
   */
  @IsEnum(AppEnv)
  APP_ENV!: AppEnv;

  /**
   * Application server mode. Can be 'http', 'ws', 'worker'
   * @example
   * ```yaml
   * APP_SERVER: 'http'
   * ```
   */
  @IsEnum(AppServer)
  @IsOptional()
  APP_SERVER: AppServer = AppServer.HTTP;

  /**   * Application URL
   * @example
   * ```yaml
   * APP_URL: 'http://localhost:6700'
   * ```
   */
  @IsString()
  APP_URL!: string;
}

export const AppConfig = registerAs('app', () => {
  const env = validateEnv(AppConfigEnvironmentVariables);

  return {
    env: env.APP_ENV,
    server: env.APP_SERVER,
    name: 'UGI',
    shortname: 'ugi',
    port: env.PORT,
    url: env.APP_URL,
  };
});
