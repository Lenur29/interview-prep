import { ForbiddenError } from './forbidden.error.js';

export interface AccessDeniedErrorOptions {
  action: string;
  context: Record<string, unknown>;
  message?: string;
}

export class AccessDeniedError extends ForbiddenError {
  constructor(opts: AccessDeniedErrorOptions) {
    super({
      key: 'AUTH_ACCESS_DENIED',
      message: opts.message ?? `Access denied: you don't have permission to perform "${opts.action}" action`,
      context: opts.context,
    });
    this.name = 'AccessDeniedError';
  }
}
