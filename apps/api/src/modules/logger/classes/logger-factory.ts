import { type Logger as WinstonLogger } from 'winston';

import { type LoggerContext } from '../logger.interfaces.js';
import { Logger } from './logger.js';
import { TypeOrmLogger, type TypeOrmLoggerOptions } from './typeorm-logger.js';

/**
 * Logger factory for creating loggers with predefined context
 */
export class LoggerFactory {
  constructor(
    private readonly winstonLogger: WinstonLogger,
    private context: LoggerContext = {},
  ) {}

  /**
   * Create new logger with specific context merged with global context
   */
  create(context: LoggerContext = {}) {
    return new Logger(this.winstonLogger, {
      ...this.context,
      ...context,
    });
  }

  createTypeOrmLogger(opts: Omit<TypeOrmLoggerOptions, 'logger'>) {
    return new TypeOrmLogger({
      logger: this.create({
        scope: 'TypeORM',
      }),
      ...opts,
    });
  }
}
