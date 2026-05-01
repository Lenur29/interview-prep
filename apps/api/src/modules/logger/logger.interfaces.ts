import { type ModuleMetadata, type Type } from '@nestjs/common';
import { type LoggerOptions } from 'winston';

export type LoggerModuleOptions = LoggerOptions;
export type WinstonLogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * Logger context with specific data for logging
 */
export interface LoggerContext {
  /**
   * Scope where the message was logged
   * @example 'VideoService'
   */
  scope?: string;

  /**
   * Action where the message was logged
   * @example 'createOutput'
   */
  action?: string;

  /**
   * Additional data
   */
  [key: string]: unknown;
}

export interface InfoObject extends LoggerContext {
  message: string;
}

export interface LoggerModuleOptionsFactory {
  createLoggerModuleOptions():
    | Promise<LoggerModuleOptions>
    | LoggerModuleOptions;
}

export interface LoggerModuleAsyncOptions
  extends Partial<Pick<ModuleMetadata, 'imports'>> {
  useFactory?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
  useClass?: Type<LoggerModuleOptionsFactory>;
}

/**
 * Error object that is destructured and logged by Logger
 */
export interface DestructuredError {
  message?: string;
  stack?: string;
  errorKey?: string;
  statusCode?: number;
  cause?: DestructuredError;
  context?: LoggerContext;
  body?: unknown;
}
