import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/user.entity.js';
import { UserRole } from '../user-roles/user-role.entity.js';
import { CurrentUserService } from './current-user.service.js';
import { CurrentUserPermissionsService } from './current-user-permissions.service.js';
import { CurrentUserCacheHandler } from './current-user-cache.handler.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole]),
  ],
  providers: [
    CurrentUserService,
    CurrentUserPermissionsService,
    CurrentUserCacheHandler,
  ],
  exports: [
    CurrentUserService,
    CurrentUserPermissionsService,
  ],
})
export class CurrentUserModule {}
