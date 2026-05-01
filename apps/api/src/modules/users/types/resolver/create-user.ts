import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail, Length, MinLength,
} from 'class-validator';

import type { MaybeNull } from '@pcg/predicates';

@InputType()
export class CreateUserInput {
  /**
   * User first name
   * @example 'John'
   */
  @Field({
    description: 'e.g. "John"',
  })
  @MinLength(1)
  firstName!: string;

  /**
   * User last name
   * @example 'Doe'
   */
  @Field({
    description: 'e.g. "Doe"',
  })
  @MinLength(1)
  lastName!: string;

  /**
   * User email address
   * @example 'john.doe@example.com'
   */
  @Field({
    description: 'e.g. "john.doe@example.com"',
  })
  @IsEmail()
  email!: string;

  /**
   * User password
   * @example 'qwerty'
   */
  @Field()
  @Length(6, 50)
  password!: string;

  /**
   * User's avatar image ID
   */
  @Field(() => String, {
    nullable: true,
  })
  avatarId?: MaybeNull<string>;
}
