import {
  Inject, type Provider,
} from '@nestjs/common';
import {
  createLogger,
  type Logger as WinstonLogger,
  type LoggerOptions,
} from 'winston';

import { LoggerFactory } from './classes/logger-factory.js';
import { NestSystemLogger } from './classes/nest-system-logger.js';
import {
  LOGGER_FACTORY_PROVIDER,
  LOGGER_MODULE_OPTIONS,
  LOGGER_PROVIDER,
  SYSTEM_LOGGER_PROVIDER,
  WINSTON_LOGGER_PROVIDER,
} from './logger.constants.js';
import {
  type LoggerModuleAsyncOptions,
  type LoggerModuleOptions,
  type LoggerModuleOptionsFactory,
} from './logger.interfaces.js';
import { Logger } from './classes/logger.js';

/**
 * Syntax sugar. Injects logger via LOGGER_PROVIDER token
 */
export const InjectLogger = () => Inject(LOGGER_PROVIDER);

/**
 * Syntax sugar. Injects winston logger factory by LOGGER_FACTORY_PROVIDER token
 */
export const InjectLoggerFactory = () => Inject(LOGGER_FACTORY_PROVIDER);

export const createNestLogger = (
  loggerOpts: LoggerModuleOptions,
): Logger => {
  return new Logger(createLogger(loggerOpts));
};

export const createLoggerProviders = (
  loggerOpts: LoggerModuleOptions,
): Provider[] => {
  return [
    {
      provide: WINSTON_LOGGER_PROVIDER,
      useFactory: () => createLogger(loggerOpts),
    },
    {
      provide: LOGGER_PROVIDER,
      useFactory: (logger: WinstonLogger) => {
        return new Logger(logger);
      },
      inject: [WINSTON_LOGGER_PROVIDER],
    },
    {
      provide: SYSTEM_LOGGER_PROVIDER,
      useClass: NestSystemLogger,
    },
    {
      provide: LOGGER_FACTORY_PROVIDER,
      useFactory: (logger: WinstonLogger) => {
        return new LoggerFactory(logger);
      },
      inject: [WINSTON_LOGGER_PROVIDER],
    },
  ];
};

export const createLoggerAsyncProviders = (
  options: LoggerModuleAsyncOptions,
): Provider[] => {
  const providers: Provider[] = [
    {
      provide: WINSTON_LOGGER_PROVIDER,
      useFactory: (loggerOpts: LoggerOptions) => createLogger(loggerOpts),
      inject: [LOGGER_MODULE_OPTIONS],
    },
    {
      provide: LOGGER_PROVIDER,
      useFactory: (logger: WinstonLogger) => {
        return new Logger(logger);
      },
      inject: [WINSTON_LOGGER_PROVIDER],
    },
    {
      provide: SYSTEM_LOGGER_PROVIDER,
      useClass: NestSystemLogger,
    },
    {
      provide: LOGGER_FACTORY_PROVIDER,
      useFactory: (logger: WinstonLogger) => {
        return new LoggerFactory(logger);
      },
      inject: [WINSTON_LOGGER_PROVIDER],
    },
  ];

  if (options.useClass) {
    const useClass = options.useClass;
    providers.push(
      ...[
        {
          provide: LOGGER_MODULE_OPTIONS,
          useFactory: async (optionsFactory: LoggerModuleOptionsFactory) =>
            await optionsFactory.createLoggerModuleOptions(),
          inject: [useClass],
        },
        {
          provide: useClass,
          useClass,
        },
      ],
    );
  }

  if (options.useFactory) {
    providers.push({
      provide: LOGGER_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    });
  }

  return providers;
};
