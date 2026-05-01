import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';

import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';

import { type Notification } from '../notification.entity.js';
import { NOTIFICATION_REGISTRY_TOKEN } from '../registry/index.js';
import { type NotificationRegistry } from '../types/registry.js';
import { NotificationCreatedEvent } from '../types/events.js';
import { type NotificationSender } from './senders/notification.sender.js';

@Injectable()
export class NotificationsSenderService {
  private readonly logger: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @Inject(NOTIFICATION_REGISTRY_TOKEN) private readonly registry: NotificationRegistry,
    private readonly moduleRef: ModuleRef,
  ) {
    this.logger = this.loggerFactory.create({
      scope: NotificationsSenderService.name,
    });
  }

  getSenders(notification: Notification): NotificationSender<Notification, unknown>[] {
    const entry = this.registry[notification.type];

    if (!entry) {
      return [];
    }

    return entry.senders.map((senderClass) => {
      return this.moduleRef.get(senderClass, { strict: false });
    }) as NotificationSender<Notification, unknown>[];
  }

  @OnEvent(NotificationCreatedEvent.id)
  async onNotificationCreated(event: NotificationCreatedEvent): Promise<void> {
    const { notification, ctx } = event;

    const senders = this.getSenders(notification);

    if (senders.length === 0) {
      this.logger.info(`No senders registered for ${notification.type}`);

      return;
    }

    for (const sender of senders) {
      await sender.tryToSend(notification, ctx);
    }
  }
}
