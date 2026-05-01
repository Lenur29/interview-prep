import { type ValidationError } from '@nestjs/common';
import { NestError } from './nest-error.js';

export class InputValidationError extends NestError {
  constructor(errors?: ValidationError[]) {
    super({
      message: 'Input validation failed',
      key: 'INPUT_VALIDATION_ERROR',
      context: errors
        ? {
            errors,
          }
        : undefined,
    });
    this.name = 'InputValidationError';
    this.httpStatusCode = 400;
  }
}
