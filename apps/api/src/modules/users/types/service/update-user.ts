import type { MaybeNull } from '@pcg/predicates';

import { type UserStatus } from '../common.js';

import { UpdateUserInput } from '../resolver/index.js';

export class UpdateUserOptions extends UpdateUserInput {
  /**
   * User status
   * @example 'ACTIVE'
   * @see {@link UserStatus}
   */
  status?: UserStatus;

  /**
   * Invite token for secure signup.
   * Set to null to clear after successful signup.
   */
  inviteToken?: MaybeNull<string>;

  /**
   * Is 2FA enabled for the user
   */
  declare is2faEnabled?: boolean;

  /**
   * Is One-Time password enabled for the user
   */
  isOtpEnabled?: boolean;

  /**
   * One-Time password secret. Used to generate OTP codes
   */
  otpSecret?: string;
}
