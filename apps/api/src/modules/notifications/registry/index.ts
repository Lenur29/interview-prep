import { type NotificationRegistry } from '../types/registry.js';

export const NOTIFICATION_REGISTRY_TOKEN = Symbol('NOTIFICATION_REGISTRY_TOKEN');

export const notificationRegistry: NotificationRegistry = {};
