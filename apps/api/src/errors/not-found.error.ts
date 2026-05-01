import { NestError, type NestErrorOptions } from './nest-error.js';

export class NotFoundError extends NestError {
  constructor(opts: NestErrorOptions) {
    super(opts);
    this.name = 'NotFoundError';
    this.httpStatusCode = 404;
  }
}
