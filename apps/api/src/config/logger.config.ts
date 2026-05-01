import { registerAs } from '@nestjs/config';
import * as winston from 'winston';
import { nestLikeConsoleFormat } from '@/modules/logger/winston.tools.js';
import { AppEnv } from '@/enums/app-env.enum.js';
import { AppServer } from '@/enums/app-server.enum.js';

export const LoggerConfig = registerAs('LoggerConfig', () => {
  const isLocal = process.env.APP_ENV === AppEnv.LOCAL;
  const logFilename = process.env.APP_SERVER === AppServer.WORKER
    ? 'logs/worker.log'
    : 'logs/api.log';

  const format = isLocal
    ? winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        nestLikeConsoleFormat('TrustLoop'),
      )
    : winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.json(),
      );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: 'debug',
      format,
    }),
  ];

  if (isLocal) {
    transports.push(
      new winston.transports.File({
        filename: logFilename,
        level: 'debug',
        format: winston.format.combine(
          winston.format.json(),
        ),
        options: { flags: 'w' },
      }),
    );
  }

  return {
    format,
    transports,
  } satisfies winston.LoggerOptions;
});
