import type { MaybeNull } from '@pcg/predicates';

export interface CreateSessionOptions {
  userId: string;
  ipAddress?: MaybeNull<string>;
  userAgent?: MaybeNull<string>;
}
