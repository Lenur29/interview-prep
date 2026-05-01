import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ChangeUserEmailInput {
  /**
   * User ID to change email for.
   * If not provided, changes email for the current user.
   */
  @Field({
    nullable: true,
  })
  userId?: string;

  /**
   * New email address
   * @example 'john.doe@example.com'
   */
  @Field({
    description: 'New email address',
  })
  newEmail!: string;
}
