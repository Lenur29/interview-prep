import { NestError } from '@/errors/nest-error.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { AppEnv } from '@/enums/app-env.enum.js';

export interface GraphQLErrorStackItem {
  key: string;
  message: string;
  context: Record<string, unknown>;
  stacktrace?: string;
}

const deepCreateErrorStack = (stack: GraphQLErrorStackItem[], error: unknown) => {
  if (error instanceof NestError) {
    stack.push({
      key: error.key,
      message: error.message,
      context: error.context ?? {
      },
      stacktrace: error.stack,
    });

    if (error.cause) {
      deepCreateErrorStack(stack, error.cause);
    }
  } else if (error instanceof Error) {
    stack.push({
      key: 'UNKNOWN_ERROR',
      message: error.message,
      context: {
      },
      stacktrace: error.stack,
    });
  }
};

export interface CreateGraphQLErrorFormatterOptions {
  logger: Logger;
}

export const createGraphQLErrorFormatter = (opts: CreateGraphQLErrorFormatterOptions) => (
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError => {
  const originalError = unwrapResolverError(error);

  const { logger } = opts;

  if (originalError instanceof NestError) {
    if (formattedError.extensions) {
      formattedError.extensions.statusCode = originalError.httpStatusCode;
      formattedError.extensions.key = originalError.key;
      formattedError.extensions.context = originalError.context;

      const errorStack: GraphQLErrorStackItem[] = [];
      deepCreateErrorStack(errorStack, originalError);
      formattedError.extensions.errorStack = errorStack;
    }
  } else if (originalError instanceof GraphQLError) {
    logger.error(originalError);

    if (formattedError.extensions) {
      formattedError.extensions.statusCode = 500;
      formattedError.extensions.key = 'GRAPHQL_ERROR';
      formattedError.extensions.context = {
      };
    }
  } else if (originalError instanceof Error) {
    logger.error(originalError);

    if (formattedError.extensions) {
      formattedError.extensions.statusCode = 500;
      formattedError.extensions.key = 'UNKNOWN_ERROR';
      formattedError.extensions.context = {
      };
    }
  }

  if (formattedError.extensions) {
    formattedError.extensions.format = 'NESTJS';
  }

  delete formattedError.extensions?.code;

  if (process.env.APP_ENV === AppEnv.PRODUCTION) {
    delete formattedError.extensions?.stacktrace;
    delete formattedError.extensions?.errorStack;
  }

  return formattedError;
};
