import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import { OnHook } from '@/modules/hooks/hooks.decorators.js';
import { CACHE_MANAGER } from '@/modules/cache/cache.module.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { UserUpdatedHook } from '@/modules/users/hooks/index.js';

/**
 * Fields whose changes must invalidate the cached current-user entity so the
 * next `me` query reflects them. Covers 2FA secrets plus everything exposed
 * through the `Me` GraphQL query (basic profile + avatar).
 */
const CACHE_INVALIDATING_USER_FIELDS = [
  'is2faEnabled',
  'isOtpEnabled',
  'otpSecret',
  'firstName',
  'lastName',
  'fullName',
  'email',
  'avatarId',
  'phoneNumber',
  'pushNotificationsEnabled',
];

/**
 * Handler that clears current user cache when relevant user fields change.
 */
@Injectable()
export class CurrentUserCacheHandler {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  /**
   * Clear cache for a specific user by deleting all cache keys matching the user ID pattern.
   * Cache keys follow the format: `current-user-${userId}`
   */
  private async clearUserCache(userId: string, reason: string): Promise<void> {
    this.logger.debug(`Clearing cache for user ${userId}: ${reason}`);

    const store = this.cache.stores?.[0] as {
      iterator?: (opts: object) => AsyncIterable<[string, unknown]>;
    } | undefined;

    if (store?.iterator) {
      const keysToDelete: string[] = [];

      for await (const [key] of store.iterator({})) {
        if (key.startsWith(`current-user-${userId}`)) {
          keysToDelete.push(key);
        }
      }

      await Promise.all(keysToDelete.map((key) => this.cache.del(key)));

      this.logger.debug(`Cleared ${keysToDelete.length} cache entries for user ${userId}`);
    } else {
      this.logger.debug(`Cache store does not support iterator, clearing all cache for user ${userId}`);
      await this.cache.clear();
    }
  }

  /**
   * Check if any of the changed fields affect the cache
   */
  private hasRelevantChanges(changedFields: string[] | undefined, relevantFields: string[]): boolean {
    if (!changedFields || changedFields.length === 0) {
      return false;
    }

    return changedFields.some((field) => relevantFields.includes(field));
  }

  @OnHook(UserUpdatedHook)
  async handleUserUpdated(hook: UserUpdatedHook): Promise<void> {
    const { id, changedFields } = hook.payload ?? {};

    if (!id || !this.hasRelevantChanges(changedFields, CACHE_INVALIDATING_USER_FIELDS)) {
      this.logger.debug(`User ${id} updated, but no cache-affecting fields changed`);

      return;
    }

    await this.clearUserCache(id, `user updated (fields: ${changedFields?.join(', ')})`);
  }
}
