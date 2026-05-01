import { type User } from '@/modules/users/user.entity.js';
import { type ActionScopesArray } from '@pcg/auth';
import { type EntityManager } from 'typeorm';

/**
 * Context object for service methods.
 * Passed from resolvers/controllers to service layer.
 */
export interface ServiceMethodContext {
  /**
   * The current user making the request.
   */
  user: User;

  /**
   * Make the request silent, meaning no notifications and actions will be sent.
   */
  isSilent?: boolean;

  /**
   * Checks if the user has permission to perform the specified action.
   * @param action The action to check permission for.
   * @param actionScopes Optional scopes to check permission against.
   * @returns True if the user has permission, false otherwise.
   */
  isGranted(action: string, actionScopes?: ActionScopesArray): boolean;

  /**
   * Check permission and throw AccessDenied error if user doesn't have permission
   * @param action - action string
   * @param scopes - scopes where action was executed
   * @throws AccessDeniedError if the user doesn't have the permission
   */
  validateAccess(action: string, scopes?: ActionScopesArray): void;

  /**
   * TypeORM EntityManager for transaction support.
   * When set, all repository operations should use this manager.
   */
  transaction?: EntityManager;
}
