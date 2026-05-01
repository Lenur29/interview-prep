import { Global, Module } from '@nestjs/common';

import { IdService } from './id.service.js';

/**
 * An IdModule is a module within your application that provides services to generate unique IDs
 * for entities and other data objects.
 * @example
 * ```ts
 * // app.module.ts
 * import { IdModule } from './id.module';
 *
 * @Module({
 *   imports: [IdModule],
 *   controllers: [AppController],
 *   providers: [AppService],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [IdService],
  exports: [IdService],
})
export class IdModule {}
