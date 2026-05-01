import { type User } from '@/modules/users/user.entity.js';
import { RegisterInput } from '../resolver/register.js';

export class RegisterOptions extends RegisterInput {}

export class RegisterResult {
  user!: User;
}
