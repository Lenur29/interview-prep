/**
 * Define statuses. Returns array of statuses from filter or default statuses
 * @param statuses - array of statuses from filter. Can be undefined
 * @param defaultStatuses - array of default statuses
 * @returns final array of statuses
 * @example
 * const statuses = defineStatuses(['active', 'pending'], ['active']);
 * // statuses = ['active', 'pending']
 *
 * const statuses = defineStatuses(undefined, ['active']);
 * // statuses = ['active']
 */
export const defineStatuses = <T>(statuses: T[] | undefined, defaultStatuses: T[]) => {
  return Array.isArray(statuses) ? statuses : defaultStatuses;
};
