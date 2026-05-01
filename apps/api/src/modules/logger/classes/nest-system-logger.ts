import {
  ConsoleLogger, Inject, Injectable, type LogLevel as NestLogLevel,
} from '@nestjs/common';
import { isPlainObject } from '@pcg/predicates';

import { LOGGER_PROVIDER } from '../logger.constants.js';
import type { WinstonLogLevel } from '../logger.interfaces.js';
import { type Logger } from './logger.js';

@Injectable()
export class NestSystemLogger extends ConsoleLogger {
  @Inject(LOGGER_PROVIDER) private readonly logger!: Logger;

  protected printMessages(messages: unknown[], context?: string, logLevel?: NestLogLevel): void {
    for (const message of messages) {
      this.logger.log(this.getWinstonLogLevel(logLevel), this.stringifyMessage(message), {
        scope: context,
      });
    }
  }

  protected stringifyMessage(message: unknown): string {
    if (typeof message === 'function') {
      return this.stringifyMessage((message as () => unknown)());
    }

    if (isPlainObject(message) || Array.isArray(message)) {
      return JSON.stringify(
        message,
        (key, value: unknown) =>
          typeof value === 'bigint' ? value.toString() : value,
        2,
      );
    }

    return String(message);
  }

  private getWinstonLogLevel(level?: NestLogLevel): WinstonLogLevel {
    switch (level) {
      case 'log':
        return 'info';
      case 'verbose':
        return 'verbose';
      case 'debug':
        return 'debug';
      case 'warn':
        return 'warn';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }
}
