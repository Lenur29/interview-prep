import { NestError } from '@/errors/nest-error.js';

export enum CursorErrorMessage {
  CURSOR = 'Invalid cursor',
  FIRST_OR_LAST = `Should pass exactly one of arguments ('first'/'last')`,
}

export class InvalidCursorError extends NestError {
  constructor(public message: CursorErrorMessage) {
    super({
      message,
      key: 'INVALID_CURSOR',
    });
    this.name = 'InvalidCursorError';
  }
}
