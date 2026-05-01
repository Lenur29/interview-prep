import { Global, Module } from '@nestjs/common';

import { PostgresPubSub } from './postgres-pubsub.js';

/**
 * PostgresPubSubModule provides PostgreSQL NOTIFY/LISTEN based PubSub engine
 * for GraphQL subscriptions in NestJS applications.
 */
@Global()
@Module({
  providers: [
    PostgresPubSub,
  ],
  exports: [
    PostgresPubSub,
  ],
})
export class PostgresPubSubModule {}
