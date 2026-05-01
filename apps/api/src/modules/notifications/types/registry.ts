import { type Provider, type Type } from '@nestjs/common';

import { type Notification } from '../notification.entity.js';
import { type NotificationSender } from '../sender/senders/notification.sender.js';

export interface NotificationRegistryEntry {
  notification: Type<Notification>;
  senders: Type<NotificationSender<Notification, unknown>>[];
}

export type NotificationRegistry = Record<string, NotificationRegistryEntry>;

export const registryAsProviders = (registry: NotificationRegistry): Provider[] => {
  const providers: Provider[] = [];

  for (const { notification, senders } of Object.values(registry)) {
    providers.push(notification);
    providers.push(...senders);
  }

  return providers;
};

export const sendersAsProviders = (registry: NotificationRegistry): Provider[] => {
  const providers: Provider[] = [];

  for (const { senders } of Object.values(registry)) {
    providers.push(...senders);
  }

  return providers;
};
