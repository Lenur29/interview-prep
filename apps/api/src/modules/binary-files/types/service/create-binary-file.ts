import { type FileLocation } from '@/types/locations.js';
import type { BinaryFileMeta } from '../common.js';

export interface CreateBinaryFileOptions {
  readonly id?: string;
  readonly meta: BinaryFileMeta;
  readonly url: string;
  readonly description?: string;
  readonly isPrivate?: boolean;
}

export interface CreateBinaryFileFromLocationOptions {
  readonly id?: string;
  readonly meta: BinaryFileMeta;
  readonly location: FileLocation;
  readonly isPrivate?: boolean;
  readonly description?: string;
}
