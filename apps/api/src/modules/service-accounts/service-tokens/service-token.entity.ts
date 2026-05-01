import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { MaybeNull } from '@pcg/predicates';

import type { User } from '@/modules/users/user.entity.js';

/**
 * The ServiceToken database record is used to manage service accounts authentication.
 * It includes the token ID, token name, expiration date, creation date, and user ID that the token belongs to.
 */
@ObjectType()
@Entity('service_tokens')
export class ServiceToken extends BaseEntity {
  /**
   * The service token ID in the database
   */
  @Field()
  @PrimaryColumn()
  id!: string;

  /**
   * The service token name
   */
  @Field(() => String, {
    nullable: true,
    description: 'Service account token display name (e.g. "Default")',
  })
  @Column({
    type: 'varchar',
    nullable: true,
  })
  name?: MaybeNull<string>;

  /**
   * The service token expiration date
   */
  @Field(() => Date, {
    description: 'The service token expiration date',
    nullable: true,
  })
  @Column({
    type: 'timestamptz',
    precision: 3,
    nullable: true,
  })
  expiresAt?: Date;

  /**
   * The refresh token creation date
   */
  @Field(() => Date)
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;

  /**
   * The service account ID
   */
  @Field(() => String)
  @Column()
  serviceAccountId!: string;

  @Field(() => String)
  @ManyToOne(
    'User',
    {
      onDelete: 'CASCADE',
      lazy: true,
    },
  )
  serviceAccount!: Promise<User>;
}
