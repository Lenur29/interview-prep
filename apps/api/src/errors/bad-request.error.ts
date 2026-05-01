import { NestError, type NestErrorOptions } from './nest-error.js';

export class BadRequestError extends NestError {
  constructor(opts: NestErrorOptions) {
    super(opts);
    this.name = 'BadRequestError';
    this.httpStatusCode = 400;
  }
}
