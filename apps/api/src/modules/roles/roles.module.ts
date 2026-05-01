import { Module } from '@nestjs/common';

import { RolesResolver } from './roles.resolver.js';
import { RolesService } from './roles.service.js';

@Module({
  providers: [RolesResolver, RolesService],
  exports: [RolesService],
})
export class RolesModule {}
