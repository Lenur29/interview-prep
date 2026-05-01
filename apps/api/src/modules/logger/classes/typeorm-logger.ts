import type { LogLevel, LogMessage } from 'typeorm';
import { AbstractLogger } from 'typeorm/logger/AbstractLogger.js';
import type { LoggerOptions } from 'typeorm/logger/LoggerOptions.js';

import { type LoggerContext } from '../logger.interfaces.js';
import { type Logger } from './logger.js';

export class TypeOrmLoggerOptions {
  enabled?: boolean;
  logger!: Logger;
  levels?: LoggerOptions;
}

export class TypeOrmLogger extends AbstractLogger {
  logger: Logger;

  constructor(opts: TypeOrmLoggerOptions) {
    super(opts.enabled && opts.levels ? opts.levels : false);
    this.logger = opts.logger;
  }

  protected writeLog(
    level: LogLevel,
    logMessage: LogMessage | LogMessage[],
  ) {
    const messages = this.prepareLogMessages(logMessage, {
      highlightSql: false,
    });

    for (const message of messages) {
      switch (message.type ?? level) {
        case 'log':
        case 'query':
        case 'schema-build':
          this.logger.debug(String(message.message), this.getCtx(message));
          break;

        case 'migration':
        case 'info':
          if (message.prefix) {
            this.logger.info(`${message.prefix} ${String(message.message)}`, this.getCtx(message));
          } else {
            this.logger.info(String(message.message), this.getCtx(message));
          }
          break;

        case 'warn':
        case 'query-slow':
          if (message.prefix) {
            this.logger.warn(`${message.prefix} ${String(message.message)}`, this.getCtx(message));
          } else {
            this.logger.warn(String(message.message), this.getCtx(message));
          }
          break;

        case 'error':
        case 'query-error':
          if (message.prefix) {
            this.logger.error(`[${message.prefix}] ${String(message.message)}`, this.getCtx(message));
          } else {
            this.logger.error(String(message.message), this.getCtx(message));
          }
          break;
      }
    }
  }

  private getCtx(message: LogMessage): LoggerContext {
    const ctx = {
      ...message.additionalInfo,
    };

    if (Array.isArray(ctx.parameters)) {
      ctx.parameters = message.parameters;
    }

    return ctx;
  }
}
