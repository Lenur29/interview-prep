import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module.js';
import { ServiceAccountsResolver } from './service-accounts.resolver.js';
import { ServiceAccountsService } from './service-accounts.service.js';
import { ServiceToken } from './service-tokens/service-token.entity.js';
import { ServiceTokensResolver } from './service-tokens/service-tokens.resolver.js';
import { ServiceTokensService } from './service-tokens/service-tokens.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceToken,
    ]),
    UsersModule,
  ],
  providers: [
    ServiceAccountsService,
    ServiceAccountsResolver,
    ServiceTokensService,
    ServiceTokensResolver,
  ],
  exports: [
    ServiceAccountsService,
    ServiceTokensService,
  ],
})
export class ServiceAccountsModule {}
