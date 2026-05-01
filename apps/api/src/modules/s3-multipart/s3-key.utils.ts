import { randomUUID } from 'node:crypto';
import path from 'node:path';

/**
 * Generates a safe S3 key from a filename.
 * Ignores the original name entirely — uses only the sanitized extension.
 */
export function sanitizeS3Key(filename: string): string {
  const ext = extractSafeExtension(filename);

  return ext ? `${randomUUID()}${ext}` : randomUUID();
}

function extractSafeExtension(filename: string): string {
  const basename = path.basename(filename);
  const dotIndex = basename.lastIndexOf('.');

  if (dotIndex <= 0) return '';

  const ext = basename.slice(dotIndex);

  return /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : '';
}

/**
 * Validates that an S3 key doesn't contain path traversal sequences.
 */
export function isValidS3Key(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('..')) return false;
  if (key.includes('\x00')) return false;
  if (key.startsWith('/')) return false;

  return true;
}
