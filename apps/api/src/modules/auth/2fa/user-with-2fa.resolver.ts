import { User } from '@/modules/users/user.entity.js';
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User2faMethod } from './types/common.js';
import { User2faService } from './user-2fa.service.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { ActionContextParam } from '@/context/action-context.decorator.js';
import type { ActionContext } from '@/context/action-context.js';
import type { MaybeNull } from '@pcg/predicates';
import { Disable2faInput } from './types/resolver/index.js';

@ObjectType()
class Disable2faPayload {
  @Field(() => User)
  user!: User;
}

@Resolver(() => User)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class UserWith2faResolver {
  constructor(
    private readonly user2faService: User2faService,
  ) {}

  @ResolveField(() => User2faMethod, {
    nullable: true,
  })
  preferred2faMethod(
    @Parent() user: User,
  ): MaybeNull<User2faMethod> {
    return this.user2faService.getPreferred2faMethod(user);
  }

  @Mutation(() => Disable2faPayload, {
    description: 'Disable Two-Factor Authentication for a user. This also disables OTP.',
  })
  async disable2fa(
    @Args('input') input: Disable2faInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<Disable2faPayload> {
    return await this.user2faService.disable2fa(input, ctx);
  }
}
