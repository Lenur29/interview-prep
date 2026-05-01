import { type User } from '@/modules/users/user.entity.js';
import { ConfigureOtpInput } from '../resolver/configure-otp.js';

export class ConfigureOtpOptions extends ConfigureOtpInput {}
export class ConfigureOtpResult {
  /**
   * The secret key to use for generating OTP codes.
   */
  secret!: string;

  /**
   * The URL to use for configuring OTP in the user's OTP app.
   */
  otpAuthUrl!: string;

  /**
   * The user to configure OTP for
   */
  user!: User;
}
