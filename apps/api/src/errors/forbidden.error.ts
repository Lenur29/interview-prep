import { NestError, type NestErrorOptions } from './nest-error.js';

export class ForbiddenError extends NestError {
  constructor(opts: NestErrorOptions) {
    super(opts);
    this.name = 'ForbiddenError';
    this.httpStatusCode = 403;
  }
}
