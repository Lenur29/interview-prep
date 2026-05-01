import { Injectable, type Type } from '@nestjs/common';
import type { MaybeNull } from '@pcg/predicates';

import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';

import { type Notification } from '../../notification.entity.js';

@Injectable()
export abstract class NotificationSender<T extends Notification, N> {
  @InjectLoggerFactory() protected readonly loggerFactory!: LoggerFactory;

  protected logger!: Logger;

  constructor(public readonly notificationClassRef: Type<T>) {}

  onModuleInit(): void {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  async format(notification: T, ctx: ServiceMethodContext): Promise<N> {
    void ctx;

    throw new Error(`format() not implemented for ${notification.type}`);
  }

  abstract getReceiver(notification: T, ctx: ServiceMethodContext): Promise<MaybeNull<string>>;

  abstract send(receiver: string, notification: T, ctx: ServiceMethodContext): Promise<void>;

  async tryToSend(notification: T, ctx: ServiceMethodContext): Promise<void> {
    const receiver = await this.getReceiver(notification, ctx);

    if (!receiver) {
      this.logger.info(`No receiver for ${notification.type} (${notification.id}), skipping`);

      return;
    }

    try {
      await this.send(receiver, notification, ctx);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to send ${notification.type} (${notification.id})`, error);
      } else {
        this.logger.error(`Failed to send ${notification.type} (${notification.id})`);
      }
    }
  }
}
