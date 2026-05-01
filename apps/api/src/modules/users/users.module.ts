import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesModule } from '@/modules/roles/roles.module.js';
import { UserRolesModule } from '@/modules/user-roles/user-roles.module.js';

import { User } from './user.entity.js';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RolesModule,
    UserRolesModule,
  ],
  providers: [
    UsersService,
    UsersResolver,
  ],
  exports: [
    UsersService,
    TypeOrmModule,
  ],
})
export class UsersModule {}
