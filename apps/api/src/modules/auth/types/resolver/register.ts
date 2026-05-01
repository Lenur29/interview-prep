import { Field, InputType } from '@nestjs/graphql';
import { IsStrongPassword, MinLength } from 'class-validator';
import { type MaybeNull } from '@pcg/predicates';

const MIN_PASSWORD_LENGTH = 12;

export interface IRegisterPayload<U> {
  user: U;
}

@InputType()
export class RegisterInput {
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
   * Must be at least 12 characters and include uppercase, lowercase, numbers, and symbols.
   * @example "SecurePass123!"
   */
  @Field({
    description: 'Minimum 12 characters, including uppercase, lowercase, numbers, and symbols',
  })
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  })
  @IsStrongPassword(
    {
      minLength: MIN_PASSWORD_LENGTH,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message: 'Password must include uppercase, lowercase, numbers, and symbols',
    },
  )
  password!: string;

  /**
   * User's first name
   * @example 'John'
   */
  @Field({
    description: 'e.g. "John"',
  })
  firstName!: string;

  /**
   * User's last name
   * @example 'Doe'
   */
  @Field({
    description: 'e.g. "Doe"',
  })
  lastName!: string;

  /**
   * Organization ID where user will be invited
   */
  @Field({
    description: 'e.g. "hcorg:xj29go2lhfir"',
    nullable: true,
  })
  organizationId?: string;

  /**
   * User's avatar URL
   * @example 'https://example.com/avatar.png'
   */
  @Field({
    nullable: true,
    description: 'e.g. "https://example.com/avatar.png"',
  })
  avatarUrl?: string;

  /**
   * User's mobile phone number
   * @example '+380501234567'
   */
  @Field({
    description: 'e.g. "+380501234567"',
  })
  mobilePhone!: string;

  /**
   * Who referred the user to the system?
   * @example 'John Doe'
   * */
  @Field(() => String, {
    nullable: true,
    description: 'Who referred the user to the system?',
  })
  referrer?: MaybeNull<string>;

  /**
   * Invite token for secure registration.
   * Required when registering as a pre-invited user (WAITING_FOR_SIGNUP status).
   */
  @Field(() => String, {
    nullable: true,
    description: 'Invite token for secure registration (required for pre-invited users)',
  })
  inviteToken?: MaybeNull<string>;
}
