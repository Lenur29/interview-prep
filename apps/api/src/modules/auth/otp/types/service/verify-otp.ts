import { type User } from '@/modules/users/user.entity.js';

import { VerifyOtpInput } from '../resolver/verify-otp.js';

export class VerifyOtpOptions extends VerifyOtpInput {}

export class VerifyOtpResult {
  user!: User;
}
