import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRole } from './user-role.entity.js';
import { UserRolesResolver } from './user-roles.resolver.js';
import { UserRolesService } from './user-roles.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRole]),
  ],
  providers: [
    UserRolesService,
    UserRolesResolver,
  ],
  exports: [
    UserRolesService,
  ],
})
export class UserRolesModule {}
