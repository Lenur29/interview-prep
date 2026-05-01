import { registerAs } from '@nestjs/config';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { type PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';

import { AppEnv } from '@/enums/app-env.enum.js';
import { validateEnv } from '@/tools/validate-env.js';
import { SnakeNamingStrategy } from '@pcg/typeorm';

class DbConfigEnvironmentVariables {
  @IsString()
  POSTGRES_HOST!: string;

  @Type(() => Number)
  @IsNumber()
  POSTGRES_PORT!: number;

  @IsString()
  POSTGRES_USER!: string;

  @IsString()
  POSTGRES_PASS!: string;

  @IsString()
  POSTGRES_DB!: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  POSTGRES_IS_LOGGING_ENABLED?: boolean;
}

export const DbConfig = registerAs('db', (): PostgresConnectionOptions => {
  const env = validateEnv(DbConfigEnvironmentVariables);

  return {
    type: 'postgres',
    logging: env.POSTGRES_IS_LOGGING_ENABLED,
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASS,
    database: env.POSTGRES_DB,
    synchronize: process.env.APP_ENV === AppEnv.LOCAL,
    subscribers: ['dist/**/*.entity-subscriber.js'],
    namingStrategy: new SnakeNamingStrategy(),
    entities: ['dist/**/*.entity.js'],
  };
});
