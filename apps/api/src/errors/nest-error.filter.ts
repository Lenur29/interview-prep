import {
  type ArgumentsHost, Catch, type HttpServer,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql/dist/services/gql-arguments-host.js';

import { NestError } from './nest-error.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

type ContextType = 'http' | 'ws' | 'rpc' | 'graphql';

/**
 * Http exception filter for NestJS
 * It is used to correctly log all http exceptions
 * @example
 * ```ts
 * // main.ts
 * const { httpAdapter } = app.get(HttpAdapterHost);
 * app.useGlobalFilters(new NestErrorFilter(httpAdapter));
 * ```
 */
@Catch(NestError)
export class NestErrorFilter {
  private readonly logger: Logger;

  constructor(
    private readonly applicationRef: HttpServer,
    private readonly loggerFactory: LoggerFactory,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  catch(error: NestError, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const type = gqlHost.getType<ContextType>();

    if (!error.silent) {
      this.logger.error(error);
    }

    if (type !== 'http') {
      return error;
    }

    /**
     * If request is http, then we need to send response to client
     */
    const body: {
      message: string;
      key?: string;
      stack?: string;
      context?: Record<string, unknown>;
      statusCode: number;
    } = {
      message: error.message,
      key: error.key,
      stack: error.stack,
      context: error.context,
      statusCode: error.httpStatusCode,
    };

    this.applicationRef.reply(host.getArgByIndex(1), body, error.httpStatusCode);
  }
}
