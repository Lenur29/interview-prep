import { createRandomString } from '@pcg/text-kit';

/**
 * Generates a unique entity identifier by combining product name, entity prefix, delimiter, and random string.
 *
 * @param product - The product short name to include in the entity ID (e.g., 'fwd' for Forward)
 * @param prefix - The entity type prefix to include in the entity ID (e.g., 'u' for user, 'org' for organization)
 * @param delimiter - The delimiter to separate components (default: ':')
 * @param size - The length of the random string component (default: 11)
 * @returns A formatted entity ID string in the format: `${product}${prefix}${delimiter}${randomString}`
 *
 * @example
 * ```typescript
 * generateEntityId('fwd', 'org')
 * // Returns: 'fwdorg:A1b2C3d4E5f'
 *
 * generateEntityId('myapp', 'u', '_', 8)
 * // Returns: 'myappuser_A1b2C3d4'
 * ```
 */
export const generateEntityId = (product: string, prefix: string, delimiter = ':', size = 11): string => {
  return `${product}${prefix}${delimiter}${createRandomString(size)}`;
};
