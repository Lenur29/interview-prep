import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import type { MaybeNull } from '@pcg/predicates';
import { type App } from 'firebase-admin/app';
import { getMessaging, type Notification as BasePushNotification } from 'firebase-admin/messaging';

import { AppConfig } from '@/config/index.js';
import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { AppEnv } from '@/enums/app-env.enum.js';
import { InjectFirebaseApp } from '@/modules/firebase/firebase.providers.js';
import { type User } from '@/modules/users/user.entity.js';

import { type Notification } from '../../../notification.entity.js';
import { NotificationSender } from '../notification.sender.js';

export interface PushNotification extends BasePushNotification {
  tag?: string;
}

@Injectable()
export abstract class PushNotificationSender<T extends Notification>
  extends NotificationSender<T, PushNotification> {
  @InjectFirebaseApp() protected readonly firebaseApp!: App;
  @Inject(AppConfig.KEY) protected readonly appConfig!: ConfigType<typeof AppConfig>;

  async getReceiver(notification: Notification): Promise<MaybeNull<string>> {
    const user = await notification.user as User;

    if (!user.pushNotificationsEnabled || !user.fcmToken) {
      return null;
    }

    return user.fcmToken;
  }

  get messaging() {
    return getMessaging(this.firebaseApp);
  }

  async send(receiver: string, notification: T, ctx: ServiceMethodContext): Promise<void> {
    if (this.appConfig.env !== AppEnv.PRODUCTION && this.appConfig.env !== AppEnv.LOCAL) {
      this.logger.info(`Skipping push (env=${this.appConfig.env}) for ${notification.type} (${notification.id})`);

      return;
    }

    this.logger.info(`Sending ${notification.type} to ${receiver.substring(0, 10)}... via Firebase`);

    const { title, body, imageUrl, tag } = await this.format(notification, ctx);

    const data: Record<string, string> = {};

    if (tag) {
      data.tag = tag;
    }

    await this.messaging.send({
      token: receiver,
      notification: {
        title,
        body,
        imageUrl,
      },
      data,
    });
  }
}
