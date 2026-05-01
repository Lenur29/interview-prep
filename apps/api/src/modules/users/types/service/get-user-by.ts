import { type UserStatus, type UserType } from '../common.js';

export interface GetUserByOptions {
  id?: string;
  type?: UserType;
  email?: string;
  status?: UserStatus;
  alias?: string;
}
