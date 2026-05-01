import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ChangePasswordInput {
  /**
   * New user password
   * @example 'qwerty'
   */
  @Field({
    description: 'New user password',
  })
  password!: string;

  /**
   * Old user password
   * @example 'qwerty'
   * */
  @Field({
    description: 'Old user password',
  })
  oldPassword!: string;

  @Field({
    nullable: true,
  })
  userId?: string;
}
