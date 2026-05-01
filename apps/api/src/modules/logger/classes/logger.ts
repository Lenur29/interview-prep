import { GraphQLError } from 'graphql';
import { type LogEntry, type Logger as WinstonLogger } from 'winston';

import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { NestError } from '@/errors/nest-error.js';
import { isPlainObject } from '@pcg/predicates';
import type {
  DestructuredError,
  InfoObject, LoggerContext,
  WinstonLogLevel,
} from '../logger.interfaces.js';

/**
 * Logger with context for NestJS
 */
export class Logger {
  constructor(
    private readonly winstonLogger: WinstonLogger,
    private context: LoggerContext = {},
  ) {}

  /**
   * Create child logger with specific context
   */
  child(context: LoggerContext): Logger {
    return new Logger(this.winstonLogger, {
      ...this.context,
      ...context,
    });
  }

  /**
   * Create child logger for nest service method
   */
  forMethod(name: string, ctx?: ServiceMethodContext, other?: LoggerContext) {
    const context: LoggerContext = {
      action: name,
    };

    if (ctx) {
      Object.assign(context, {
        userId: ctx.user.id,
      });
    }

    if (other) {
      Object.assign(context, other);
    }

    return this.child(context);
  }

  /**
   * Set data to logger context
   */
  setContext(key: string, value: unknown): void;
  setContext(context: LoggerContext): void;
  setContext(...args: unknown[]): void {
    if (
      args.length === 2
      && typeof args[0] === 'string'
      && typeof args[1] !== 'undefined'
    ) {
      const key = args[0];
      const value = args[1];
      this.context[key] = value;
    } else {
      this.context = {
        ...this.context,
        ...(args[0] as LoggerContext),
      };
    }
  }

  /**
   * Get logger context data
   */
  getContext(): LoggerContext {
    return structuredClone(this.context);
  }

  /**
   * Write a 'log' level log.
   */
  log(entry: LogEntry): void;
  log(level: WinstonLogLevel, message: string, context?: LoggerContext): void;
  log(...args: unknown[]): void {
    if (isPlainObject(args[0])) {
      this.winstonLogger.log({
        ...this.context,
        ...(args[0] as LogEntry),
      });
    } else {
      this.winstonLogger.log({
        level: args[0] as WinstonLogLevel,
        message: args[1] as string,
        ...this.context,
        ...(args[2] as LoggerContext),
      });
    }
  }

  /**
   * Write a 'info' level log.
   */
  info(message: string, context?: LoggerContext): void;
  info(infoObject: InfoObject): void;
  info(...args: unknown[]): void {
    if (typeof args[0] === 'string') {
      this.winstonLogger.info({
        message: args[0],
        ...this.context,
        ...(args[1] as LoggerContext),
      });
    } else {
      this.winstonLogger.info({
        ...this.context,
        ...(args[0] as InfoObject),
      });
    }
  }

  /**
   * Write an 'error' level log.
   */
  error(messageOrError: string | Error, context?: LoggerContext): void;
  error(message: string, error: Error, context?: LoggerContext): void;
  error(...args: unknown[]): void {
    if (args[0] instanceof NestError) {
      const err = args[0];
      this.winstonLogger.error({
        ...this.context,
        ...(args[1] as LoggerContext),
        ...this.destructureError(err),
      });
    } else if (args[0] instanceof Error) {
      const err = args[0];
      this.winstonLogger.error({
        ...this.context,
        ...(args[1] as LoggerContext),
        ...this.destructureError(err),
      });
    } else if (typeof args[0] === 'string' && args[1] instanceof Error) {
      const message = args[0];
      const err = args[1];
      this.winstonLogger.error({
        message: message,
        ...this.context,
        ...(args[2] as LoggerContext),
        error: this.destructureError(err),
      });
    } else if (typeof args[0] === 'string') {
      const message = args[0];
      this.winstonLogger.error({
        message,
        ...this.context,
        ...(args[1] as LoggerContext),
      });
    }
  }

  /**
   * Creates plain object from error
   */
  protected destructureError(error: unknown): DestructuredError {
    const errorObject: DestructuredError = {};

    if (error instanceof NestError) {
      errorObject.message = error.message;
      errorObject.stack = error.stack;
      errorObject.context = error.context;
      errorObject.statusCode = error.httpStatusCode;
      errorObject.errorKey = error.key;
      if (error.cause instanceof Error) {
        errorObject.cause = this.destructureError(error.cause);
      }
    } else if (error instanceof Error) {
      errorObject.message = error.message;
      errorObject.stack = error.stack;
    }

    if (error instanceof GraphQLError) {
      const ctx = JSON.parse(JSON.stringify({
        locations: error.locations,
        positions: error.positions,
        source: error.source,
      })) as Record<string, unknown>;

      errorObject.context = {
        ...errorObject.context,
        ...ctx,
      };
    }

    return errorObject;
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: string, context?: LoggerContext): void;
  warn(infoObject: InfoObject): void;
  warn(...args: unknown[]): void {
    if (typeof args[0] === 'string') {
      this.winstonLogger.warn({
        message: args[0],
        ...this.context,
        ...(args[1] as LoggerContext),
      });
    } else {
      this.winstonLogger.warn({
        ...this.context,
        ...(args[0] as InfoObject),
      });
    }
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: string, context?: LoggerContext): void;
  debug(infoObject: InfoObject): void;
  debug(...args: unknown[]): void {
    if (typeof args[0] === 'string') {
      this.winstonLogger.debug({
        message: args[0],
        ...this.context,
        ...(args[1] as LoggerContext),
      });
    } else {
      this.winstonLogger.debug({
        ...this.context,
        ...(args[0] as InfoObject),
      });
    }
  }

  /**
   * Write a 'verbose' level log.
   */
  verbose(message: string, context?: LoggerContext): void;
  verbose(infoObject: InfoObject): void;
  verbose(...args: unknown[]): void {
    if (typeof args[0] === 'string') {
      this.winstonLogger.verbose({
        message: args[0],
        ...this.context,
        ...(args[1] as LoggerContext),
      });
    } else {
      this.winstonLogger.verbose({
        ...this.context,
        ...(args[0] as InfoObject),
      });
    }
  }
}
