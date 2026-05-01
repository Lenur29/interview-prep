import { type ServiceMethodContext } from '@/context/service-method-context.js';

import type { Notification } from '../notification.entity.js';

export class NotificationCreatedEvent {
  static readonly id = 'notification.created';

  constructor(
    public readonly notification: Notification,
    public readonly ctx: ServiceMethodContext,
  ) {}
}
