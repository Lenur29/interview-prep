import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {
  @Field()
  id!: string;

  /**
   * User first name
   * @example 'John'
   */
  @Field({
    nullable: true,
    description: 'e.g. "John"',
  })
  firstName?: string;

  /**
   * User last name
   * @example 'Doe'
   */
  @Field({
    nullable: true,
    description: 'e.g. "Doe"',
  })
  lastName?: string;

  /**
   * User phone number
   */
  @Field({
    nullable: true,
  })
  phoneNumber?: string;

  /**
   * User password
   */
  @Field({
    nullable: true,
  })
  password?: string;

  /**
   * User's avatar image ID
   */
  @Field(() => String, {
    nullable: true,
  })
  avatarId?: string;
}
