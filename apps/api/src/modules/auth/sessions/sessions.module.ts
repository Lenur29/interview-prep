import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Session } from './session.entity.js';
import { SessionsService } from './sessions.service.js';

/**
 * Global module for session management.
 * Provides SessionsService to all modules without explicit imports.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Session])],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
