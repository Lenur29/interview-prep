import { registerEnumType } from '@nestjs/graphql';

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
});
