import { type User } from '@/modules/users/user.entity.js';

import { ValidateOtpInput } from '../resolver/validate-otp.js';

export class ValidateOtpOptions extends ValidateOtpInput {}

export class ValidateOtpResult {
  user!: User;
}
