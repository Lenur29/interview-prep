import { type User } from '@/modules/users/user.entity.js';
import { type ActionScopesArray } from '@pcg/auth';

/**
 * Action context for GraphQL mutations and queries.
 * Contains current user and permission checking methods.
 */
export interface ActionContext {
  /**
   * Current user who executes action
   */
  user: User;

  /**
   * Current session ID (only available for session-based auth, not JWT)
   */
  sessionId?: string;

  /**
   * Check if current user from context has permission
   * @param action - action string
   * @param actionScopes - scopes where action was executed
   */
  isGranted(action: string, actionScopes?: ActionScopesArray): boolean;

  /**
   * Check permission and throw AccessDenied error if user doesn't have permission
   * @param action - action string
   * @param scopes - scopes where action was executed
   * @throws AccessDeniedError if the user doesn't have the permission
   */
  validateAccess(action: string, scopes?: ActionScopesArray): void;
}
