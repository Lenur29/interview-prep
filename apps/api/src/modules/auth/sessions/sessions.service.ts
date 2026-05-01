import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import ms, { type StringValue } from 'ms';
import { type DataSource, In, LessThan, Not, type Repository } from 'typeorm';

import { SessionsConfig } from '@/config/sessions.config.js';
import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { UnauthorizedError } from '@/errors/unauthorized.error.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { Session } from './session.entity.js';
import { type CreateSessionOptions } from './types/common.js';

/**
 * Session ID length in bytes.
 * 32 bytes = 256 bits of entropy, encoded as 43-char base64url string.
 * This provides sufficient security against brute-force attacks.
 */
const SESSION_ID_BYTES = 32;

/**
 * SessionsService manages user sessions stored in the database.
 * Provides session creation, validation, extension, and cleanup functionality.
 *
 * Uses DataLoader to batch and deduplicate session lookups when multiple
 * parallel requests use the same session (e.g., concurrent GraphQL queries).
 */
@Injectable()
export class SessionsService {
  private readonly logger: Logger;

  /**
   * DataLoader for batching session lookups.
   * When multiple parallel requests need the same session,
   * they will be batched into a single database query.
   */
  private readonly sessionDataLoader: DataLoader<string, Session | null>;

  /**
   * In-memory cache tracking when each session was last extended.
   * Key: sessionId, Value: timestamp (ms) of last extension.
   *
   * Purpose:
   * When multiple parallel requests arrive with the same session cookie,
   * only the first one should trigger a DB UPDATE. Others can skip
   * because we know the session was just extended.
   *
   * This cache is local to each Node.js process. In a multi-instance
   * deployment, each instance may extend once per slidingWindow,
   * which is acceptable (worst case: a few extra UPDATEs, no data loss).
   */
  private readonly lastExtendedCache = new Map<string, number>();

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @Inject(SessionsConfig.KEY) private readonly sessionsConfig: ConfigType<typeof SessionsConfig>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger = this.loggerFactory.create({
      scope: SessionsService.name,
    });

    /**
     * DataLoader Optimization for Session Lookups
     *
     * Problem:
     * When a client sends multiple parallel GraphQL requests (e.g., Apollo Client batching),
     * each request triggers AuthGuard which calls validateSession() + extendSession().
     * Without optimization, N parallel requests = 2N database queries for the same session.
     *
     * Solution:
     * DataLoader collects all getSession() calls within a single event loop tick
     * and batches them into ONE database query with WHERE id IN (...).
     *
     * Example:
     *   3 parallel requests with same session cookie:
     *   - Without DataLoader: 6 queries (3x validateSession + 3x extendSession)
     *   - With DataLoader:    2 queries (1 batched SELECT + 1 batched SELECT)
     *
     * Note: cache: false ensures each batch gets fresh data from DB.
     * DataLoader still deduplicates within the same tick, just doesn't cache across ticks.
     */
    this.sessionDataLoader = new DataLoader(
      async (sessionIds: readonly string[]): Promise<(Session | null)[]> => {
        const uniqueIds = [...new Set(sessionIds)];

        const sessions = await this.repository.find({
          where: { id: In(uniqueIds) },
        });

        // Map results back to original order (DataLoader requirement)
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));

        return sessionIds.map((id) => sessionMap.get(id) ?? null);
      },
      {
        // Disable cross-tick caching - session data should be fresh for each request batch.
        // DataLoader still batches and deduplicates within the same event loop tick.
        cache: false,
      },
    );
  }

  get repository(): Repository<Session> {
    return this.dataSource.getRepository(Session);
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    opts: CreateSessionOptions,
    ctx: ServiceMethodContext,
  ): Promise<Session> {
    const logger = this.logger.forMethod(this.createSession.name, ctx, {
      userId: opts.userId,
    });

    const maxAgeMs = ms(this.sessionsConfig.maxAge as StringValue);
    const expiresAt = new Date(Date.now() + maxAgeMs);

    const session = this.repository.create({
      id: this.generateSessionId(),
      userId: opts.userId,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
      expiresAt,
      lastActivityAt: new Date(),
    });

    await this.repository.save(session);

    logger.info(`Created session ${session.id} for user ${opts.userId}`);

    return session;
  }

  /**
   * Get session by ID using DataLoader (batches concurrent requests)
   * @param sessionId - session ID
   * @returns session or null if not found
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return await this.sessionDataLoader.load(sessionId);
  }

  /**
   * Get session by ID directly from database (bypasses DataLoader)
   * Use this when you need guaranteed fresh data
   */
  async getSessionDirect(sessionId: string): Promise<Session | null> {
    return await this.repository.findOneBy({ id: sessionId });
  }

  /**
   * Validate session - throws if invalid or expired
   */
  async validateSession(
    sessionId: string,
  ): Promise<Session> {
    const logger = this.logger.child({
      action: this.validateSession.name,
      sessionId,
    });

    const session = await this.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedError({
        message: 'Session not found',
        key: 'SESSION_INVALID',
        context: logger.getContext(),
      });
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.repository.delete(sessionId);

      throw new UnauthorizedError({
        message: 'Session expired',
        key: 'SESSION_EXPIRED',
        context: logger.getContext(),
      });
    }

    return session;
  }

  /**
   * Extend session expiration using sliding window pattern.
   *
   * Sliding Window Session Extension:
   *
   * Configuration (from sessions.config.ts):
   *   - maxAge: 30 Days (absolute session lifetime)
   *   - slidingWindow: 15 Minutes (minimum interval between extensions)
   *
   * How it works:
   *   1. On each authenticated request, AuthGuard calls extendSession (fire-and-forget)
   *   2. We check: has more than `slidingWindow` (15 min) passed since `lastActivityAt`?
   *   3. If YES → update lastActivityAt and reset expiresAt to now + maxAge (30 days)
   *   4. If NO  → do nothing (optimization to reduce DB writes)
   *
   * Benefits:
   *   - Active users stay logged in indefinitely (session extends with activity)
   *   - Inactive users are auto-logged out after maxAge (30 days)
   *   - Reduces DB writes: updates only every 15 min, not on every request
   *   - Balances UX (no surprise logouts) with security (stale sessions expire)
   *
   * Timeline example:
   *   Day 1, 10:00  - Login → session expires Day 31, 10:00
   *   Day 1, 10:05  - Request → no update (< 15 min since login)
   *   Day 1, 10:20  - Request → UPDATE! expires = Day 31, 10:20
   *   Day 1, 10:25  - Request → no update (< 15 min since 10:20)
   *   ...
   *   Day 30, 09:00 - Request → UPDATE! expires = Day 60, 09:00
   *
   * Optimizations:
   *   1. Accepts Session object directly (avoids redundant DB SELECT after validateSession)
   *   2. In-memory cache prevents parallel requests from all triggering DB UPDATEs
   *
   * DB Operations:
   *   - Without optimizations: 1 SELECT + 1 UPDATE per request
   *   - With optimizations:    0 SELECT + 0-1 UPDATE per sliding window
   *
   * @param session - validated session object (passed from AuthGuard after validateSession)
   */
  async extendSession(session: Session): Promise<void> {
    const slidingWindowMs = ms(this.sessionsConfig.slidingWindow as StringValue);
    const maxAgeMs = ms(this.sessionsConfig.maxAge as StringValue);
    const now = Date.now();

    // Optimization 1: Check in-memory cache first
    // If we extended this session recently (within slidingWindow), skip DB entirely
    const lastExtended = this.lastExtendedCache.get(session.id);
    if (lastExtended && now - lastExtended < slidingWindowMs) {
      return; // Already extended recently, no DB operations needed
    }

    // Optimization 2: Check session.lastActivityAt (from already-loaded session)
    // No need to fetch session again - we receive it from validateSession
    const lastActivity = session.lastActivityAt.getTime();

    // Only extend if more than slidingWindow has passed since last activity.
    // This prevents unnecessary DB writes on every request.
    if (now - lastActivity > slidingWindowMs) {
      const newExpiresAt = new Date(now + maxAgeMs);

      await this.repository.update(session.id, {
        lastActivityAt: new Date(),
        expiresAt: newExpiresAt,
      });

      // Update in-memory cache to prevent parallel requests from also updating
      this.lastExtendedCache.set(session.id, now);
    }
  }

  /**
   * Clear extension cache entry when session is deleted.
   * Called internally on session deletion.
   */
  private clearExtensionCache(sessionId: string): void {
    this.lastExtendedCache.delete(sessionId);
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.clearExtensionCache(sessionId);
    await this.repository.delete(sessionId);
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteUserSessions(userId: string): Promise<void> {
    // Clear cache for all user sessions before deleting
    const sessions = await this.repository.find({
      where: { userId },
      select: ['id'],
    });
    for (const session of sessions) {
      this.clearExtensionCache(session.id);
    }
    await this.repository.delete({ userId });
  }

  /**
   * Delete all sessions except the current one (logout from other devices)
   */
  async deleteUserSessionsExcept(userId: string, currentSessionId: string): Promise<void> {
    // Clear cache for sessions being deleted
    const sessions = await this.repository.find({
      where: { userId, id: Not(currentSessionId) },
      select: ['id'],
    });
    for (const session of sessions) {
      this.clearExtensionCache(session.id);
    }
    await this.repository.delete({
      userId,
      id: Not(currentSessionId),
    });
  }

  /**
   * Get all active sessions for a user (for "Active Sessions" UI)
   */
  async getUserActiveSessions(userId: string): Promise<Session[]> {
    return await this.repository.find({
      where: {
        userId,
        expiresAt: LessThan(new Date()),
      },
      order: {
        lastActivityAt: 'DESC',
      },
    });
  }

  /**
   * Clean up expired sessions (for scheduled job)
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  /**
   * Generate cryptographically secure random session ID.
   * Uses base64url encoding (URL-safe, no padding).
   *
   * @returns 43-character random string (256 bits of entropy)
   */
  private generateSessionId(): string {
    return randomBytes(SESSION_ID_BYTES).toString('base64url');
  }
}
