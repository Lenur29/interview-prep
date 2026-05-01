import { Field, InputType } from '@nestjs/graphql';

export interface ILoginPayload<U> {
  user: U;
}

@InputType()
export class LoginInput {
  /**
   * User's email
   * @example "john.doe@example.com"
   */
  @Field({
    description: 'e.g. "john.doe@example.com"',
  })
  email!: string;

  /**
   * User's password
   * @example "qwerty1234"
   */
  @Field({
    description: 'e.g. "qwerty1234"',
  })
  password!: string;
}
