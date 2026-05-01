import { Injectable, type Type } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { IdService } from '@/modules/id/id.service.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';

import { Notification } from './notification.entity.js';
import { NotificationCreatedEvent } from './types/events.js';
import { type CreateNotificationOptions } from './types/service.js';

@Injectable()
export class NotificationsService {
  private readonly logger: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly idService: IdService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger = this.loggerFactory.create({
      scope: NotificationsService.name,
    });
  }

  get repository(): Repository<Notification> {
    return this.dataSource.getRepository(Notification);
  }

  async create<N extends Notification>(
    notificationClassRef: Type<N>,
    opts: CreateNotificationOptions,
    ctx: ServiceMethodContext,
  ): Promise<N> {
    const notification = new notificationClassRef();
    notification.id = this.idService.generateEntityId(IdPrefix.NOTIFICATION);
    notification.userId = opts.userId;
    notification.referenceId = opts.referenceId;
    notification.group = opts.group ?? 'SYSTEM';
    notification.meta = (opts.meta ?? {}) as Notification['meta'];

    const saved = await this.repository.save(notification);

    this.logger.info(`Notification created: ${saved.type} (${saved.id}) for user ${saved.userId}`);

    await this.eventEmitter.emitAsync(NotificationCreatedEvent.id, new NotificationCreatedEvent(saved, ctx));

    return saved as N;
  }
}
