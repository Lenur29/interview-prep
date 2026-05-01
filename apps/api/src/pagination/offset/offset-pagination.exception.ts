import { NestError } from '@/errors/nest-error.js';

export enum OffsetErrorMessage {
  OUTPUT_LIMIT = `Can't build page meta. Invalid limit`,
}

export class OffsetPaginationError extends NestError {
  constructor(public readonly message: OffsetErrorMessage) {
    super({
      message,
      key: 'INVALID_OFFSET_PAGINATION',
    });
    this.name = 'OffsetPaginationError';
  }
}
