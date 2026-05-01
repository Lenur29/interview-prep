import { Field } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

/**
 * PasswordRecoveryRequest is an entity model that represents a password recovery request made by a user.
 * It contains the user's email, a unique identifier for the request, a generated token,
 * and an expiration date for the request.
 *
 * This entity is used to allow users to recover their forgotten password by generating
 * a special token that can be used to reset their password.
 */
@Entity('password_recovery_requests')
export class PasswordRecoveryRequest extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  @Field()
  @IsEmail()
  @Column({
    unique: true,
  })
  email!: string;

  @Column()
  token!: string;

  @Field()
  @Column({
    type: 'timestamptz',
    default: () => 'now()',
  })
  expiresAt!: Date;
}
