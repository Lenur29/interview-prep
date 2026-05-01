import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class FetchUserInput {
  /**
   * User ID to fetch
   */
  @Field({
    nullable: true,
  })
  id?: string;

  /**
   * User email to fetch
   */
  @Field({
    nullable: true,
  })
  email?: string;

  /**
   * Return user with resolved permissions
   */
  @Field(() => Boolean, {
    nullable: true,
    deprecationReason: `Now it's automatically identified either field User.resolvedPermissions is selected`,
  })
  resolved?: boolean;
}
