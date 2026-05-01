import { BaseHook } from '@/modules/hooks/hooks.abstracts.js';
import type { User } from '../user.entity.js';

export interface UserUpdatedPayload {
  id: string;
  user: User;
  /** Fields that were changed in this update */
  changedFields?: string[];
}

/**
 * Hook emitted when a user is updated.
 * Hook ID: "user.updated"
 */
export class UserUpdatedHook extends BaseHook<UserUpdatedPayload> {}
