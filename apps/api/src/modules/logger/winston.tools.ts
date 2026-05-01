import { type LogLevel } from '@nestjs/common';
import clc from 'cli-color';
import { type Format } from 'logform';
import { format } from 'winston';
import { type DestructuredError } from './logger.interfaces.js';

type ColorFn = (text: string) => string;

const nestLikeColorScheme: Record<string, ColorFn> = {
  log: clc.greenBright,
  info: clc.greenBright,
  error: clc.red,
  warn: clc.yellow,
  debug: clc.magentaBright,
  verbose: clc.cyanBright,
};

/**
 * Options for nest-like formatting
 */
export interface CreatePrettyMessageOptions {
  appName: string;
  level: LogLevel;
  timestamp: string;
  message: string;
  scope?: string;
  action?: string;
  stack?: string;
  context: Record<string, unknown>;
  errorKey?: string;
  statusCode?: string;
  parentPath?: string;
  cause?: DestructuredError;
  deep?: number;
}

/**
 * Create a pretty message for the logger with nest-like formatting
 * @example
 * [App]  - 6/10/2022, 4:33:42 PM      ERROR [VideoService.createOutput] Failed to create output
 */
export const createPrettyMessage = ({
  appName,
  action,
  level,
  timestamp,
  message,
  scope,
  stack,
  errorKey,
  context,
  parentPath,
  cause,
  deep = 0,
}: CreatePrettyMessageOptions): string => {
  if ('undefined' !== typeof timestamp) {
    try {
      if (timestamp === new Date(timestamp).toISOString()) {
        timestamp = new Date(timestamp).toLocaleString();
      }
    } catch {
      // Ignore
    }
  }

  const color
    = nestLikeColorScheme[level] ?? ((text: string): string => text);

  if (errorKey) {
    message += ` [${errorKey}]`;
  }

  const sAppName = color(`[${appName}]`);
  const sTimestamp = timestamp ? `${timestamp} ` : '';
  const sLevel = color(level.toUpperCase());

  let path = '';
  let sPath = '';
  if ('undefined' !== typeof scope && 'undefined' !== typeof action) {
    path = `${scope}.${action}`;
  } else if ('undefined' !== typeof scope) {
    path = scope;
  } else if ('undefined' !== typeof action) {
    path = action;
  }

  if (path && parentPath) {
    path = `${parentPath} --> ${path}`;
  } else if (parentPath) {
    path = parentPath;
  }

  if (path) {
    sPath = clc.yellow(` [${path}]`);
  }

  const sMessage = color(` ${message}`);
  const sStack = 'undefined' !== typeof stack ? color(`\n ${stack}`) : '';

  let sRecursion = '';
  if (cause) {
    const {
      action,
      scope,
      ...causeContext
    } = cause.context ?? {};

    sRecursion = `\n${createPrettyMessage({
      appName,
      action,
      level,
      timestamp,
      message: cause.message ?? message,
      scope,
      stack: cause.stack,
      errorKey: cause.errorKey,
      context: causeContext,
      parentPath: path,
      cause: cause.cause,
      deep: deep + 1,
    })}`;
  }

  const sContext = Object.keys(context).length > 0 ? color(` -- ${JSON.stringify(context, null, 2)}`) : '';

  return `${sAppName}  - ${sTimestamp}     ${sLevel}${sPath}${sMessage}${sStack}${sContext}${sRecursion}`;
};

/**
 * Create a nest-like console format
 * @param appName - App name (e.g., 'MyApp', 'API')
 */
export const nestLikeConsoleFormat = (appName = 'Nest'): Format =>
  format.printf(
    ({
      level,
      timestamp,
      message,
      scope,
      action,
      stack,
      errorKey,
      statusCode,
      error: cause,
      ...context
    }) => {
      return createPrettyMessage({
        appName,
        action,
        level: level as LogLevel,
        timestamp,
        message,
        stack,
        context,
        scope,
        errorKey,
        statusCode,
        cause,
        deep: 0,
      } as CreatePrettyMessageOptions);
    },
  );
