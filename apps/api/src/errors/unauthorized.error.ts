import { NestError, type NestErrorOptions } from './nest-error.js';

export class UnauthorizedError extends NestError {
  constructor(opts: NestErrorOptions) {
    super(opts);
    this.name = 'UnauthorizedError';
    this.httpStatusCode = 401;
  }
}
