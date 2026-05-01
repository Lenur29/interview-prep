import { Query, Resolver } from '@nestjs/graphql';

import { Role } from './role.js';
import { RolesService } from './roles.service.js';

@Resolver(() => Role)
export class RolesResolver {
  constructor(private readonly rolesService: RolesService) {}

  @Query(() => [Role])
  roles(): Role[] {
    return this.rolesService.getAll();
  }
}
