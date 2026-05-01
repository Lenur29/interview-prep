import { registerEnumType } from '@nestjs/graphql';

/**
 * Users has multiple statuses.
 */
export enum UserStatus {
  /**
   * WAITING_FOR_APPROVAL - user is waiting for approval after signup.
   */
  WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL',

  /**
   * WAITING_FOR_SIGNUP - user is waiting for signup after invitation.
   */
  WAITING_FOR_SIGNUP = 'WAITING_FOR_SIGNUP',

  /**
   * ACTIVE - user is active and can signin to the system.
   * */
  ACTIVE = 'ACTIVE',

  /**
   * DISABLED - user is disabled and can't signin to the system.
   */
  DISABLED = 'DISABLED',

  /**
   * ARCHIVED - user is archived (locally managed member was archived).
   */
  ARCHIVED = 'ARCHIVED',

  /**
   * DELETED - user is deleted and can't signin to the system.
   * */
  DELETED = 'DELETED',
}

/**
 * Users has two types: USER and SA.
 */
export enum UserType {
  /** USER is a regular user, it is used for human interaction. */
  USER = 'USER',

  /**
   * SA is a service account, it is used for service to service communication.
   * Each service account registered in the system and has its own SA user.
   * When service make requests to the system, it uses its SA user.
  **/
  SA = 'SA',
}

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'Users has multiple statuses including ACTIVE, DISABLED, and DELETED.',
});

registerEnumType(UserType, {
  name: 'UserType',
  description: 'Users has two types: USER (Regular user) and SA (Service account).',
});

/**
 * Default user statuses.
 * Used in users list filter.
 */
export const defaultUserStatuses = [
  UserStatus.ACTIVE,
  UserStatus.WAITING_FOR_APPROVAL,
  UserStatus.WAITING_FOR_SIGNUP,
  UserStatus.DISABLED,
];
