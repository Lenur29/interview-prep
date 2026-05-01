import { type User } from '@/modules/users/user.entity.js';
import { UsersService } from '@/modules/users/users.service.js';
import { Injectable } from '@nestjs/common';
import { User2faMethod } from './types/common.js';
import type { MaybeNull } from '@pcg/predicates';
import type { ServiceMethodContext } from '@/context/service-method-context.js';

export interface Disable2faOptions {
  userId: string;
}

export interface Disable2faResult {
  user: User;
}

@Injectable()
export class User2faService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  getPreferred2faMethod(user: User): MaybeNull<User2faMethod> {
    if (user.isOtpEnabled) {
      // If the user has OTP enabled, we can assume they prefer the authenticator method
      // This logic can be extended based on user preferences or available methods
      return User2faMethod.AUTHENTICATOR;
    }

    // Default to null if no preferred method is set
    return null;
  }

  /**
   * Disable Two-Factor Authentication for user.
   * This also disables OTP and clears the OTP secret.
   */
  async disable2fa(opts: Disable2faOptions, ctx: ServiceMethodContext): Promise<Disable2faResult> {
    const user = await this.usersService.update({
      id: opts.userId,
      is2faEnabled: false,
      isOtpEnabled: false,
      otpSecret: undefined,
    }, ctx);

    return { user };
  }
}
