import type { MaybeNull } from '@pcg/predicates';
import {
  type UserStatus,
  type UserType,
} from '../common.js';

export class CreateUserOptions {
  id?: string;

  /**
   * User first name
   * @example 'John'
   */
  firstName!: string;

  /**
   * User last name
   * @example 'Doe'
   */
  lastName!: string;

  /**
   * User type. Can be either 'USER' or 'SA'
   * @example 'USER'
   */
  type?: UserType;

  /**
   * User status
   * @example 'WAITING_FOR_APPROVAL'
   * @see {@link UserStatus}
   */
  status?: UserStatus;

  /**
   * User email
   * @example 'john.doe@example.com'
   */
  email!: string;

  /**
   * User password
   * @example '1q2w3e4r5t6y'
   */
  password?: MaybeNull<string>;

  /**
   * User's avatar image ID
   */
  avatarId?: MaybeNull<string>;

  /**
   * User custom permissions
   */
  permissions?: string[];
}
