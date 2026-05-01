import type { User } from '@/modules/users/user.entity.js';
import { DisableOtpInput } from '../resolver/disable-otp.js';

export class DisableOtpOptions extends DisableOtpInput {}

export class DisableOtpResult {
  user!: User;
}
