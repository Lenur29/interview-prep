import { HttpStatus } from '@nestjs/common';

/**
 * Configuration options for creating a NestError instance.
 */
export interface NestErrorOptions {
  /** The human-readable error message describing what went wrong */
  message: string;

  /**
   * A unique identifier or error code for categorizing and handling the error
   * @example 'AUTH_USER_NOT_FOUND'
   */
  key: string;

  /** The underlying error that caused this error, if any */
  cause?: unknown;

  /** Additional contextual information related to the error occurrence */
  context?: Record<string, unknown>;

  /**
   * Whether the error should be silenced (i.e., not logged or reported)
   */
  silent?: boolean;
}

/**
 * Custom error class for NestJS applications that extends the native Error class.
 *
 * @example
 * ```typescript
 * throw new NestError({
 *   key: 'AUTH_USER_NOT_FOUND',
 *   message: 'User with the specified ID was not found',
 *   context: { userId: '123' },
 *   cause: originalError
 * });
 * ```
 */
export class NestError extends Error {
  key!: string;
  context?: Record<string, unknown>;
  httpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  silent!: boolean;

  constructor(opts: NestErrorOptions) {
    super(opts.message, opts.cause instanceof Error
      ? {
          cause: opts.cause,
        }
      : undefined);

    this.name = 'NestError';
    this.key = opts.key;
    this.context = opts.context;
    this.silent = opts.silent ?? false;
  }
}
