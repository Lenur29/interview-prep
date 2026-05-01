import { type LoginInput } from '../resolver/index.js';

export interface LoginOptions extends LoginInput {}

export interface LoginResult<U> {
  user: U;
}
