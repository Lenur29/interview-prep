import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FirebaseModule } from '@/modules/firebase/firebase.module.js';
import { IdModule } from '@/modules/id/id.module.js';
import { User } from '@/modules/users/user.entity.js';

import { Notification } from './notification.entity.js';
import { NotificationsService } from './notifications.service.js';
import { NOTIFICATION_REGISTRY_TOKEN, notificationRegistry } from './registry/index.js';
import { NotificationsSenderService } from './sender/notifications-sender.service.js';
import { sendersAsProviders } from './types/registry.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
    ]),
    IdModule,
    FirebaseModule,
  ],
  providers: [
    {
      provide: NOTIFICATION_REGISTRY_TOKEN,
      useValue: notificationRegistry,
    },
    NotificationsService,
    NotificationsSenderService,
    ...sendersAsProviders(notificationRegistry),
  ],
  exports: [
    NotificationsService,
  ],
})
export class NotificationsModule {}
