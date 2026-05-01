export interface CreateNotificationOptions {
  userId: string;
  referenceId: string;
  group?: string;
  meta?: Record<string, unknown>;
}
