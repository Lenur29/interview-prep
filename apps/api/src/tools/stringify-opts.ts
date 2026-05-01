/**
 * Converts an object into a human-readable string representation.
 *
 * Takes an object and transforms it into a string where each key-value pair
 * is formatted as "key JSON-value" and all pairs are joined with " and ".
 *
 * @param opts - The object to stringify
 * @returns A string representation of the object with entries joined by " and "
 *
 * @example
 * ```ts
 * stringifyOpts({ name: 'John', age: 30 })
 * // Returns: 'name "John" and age 30'
 * ```
 */
export const stringifyOpts = (opts: object) => {
  return Object.entries(opts)
    .map(([key, value]) => `${key} ${JSON.stringify(value)}`)
    .join(' and ');
};
