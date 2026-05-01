import { type User } from '@/modules/users/user.entity.js';
import type { MaybeNull } from '@pcg/predicates';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Session entity represents an authenticated user session.
 * Sessions are stored in the database and can be revoked at any time.
 * This replaces the JWT access/refresh token approach for better control.
 */
@ObjectType()
@Entity('sessions')
export class Session extends BaseEntity {
  /**
   * Unique session identifier with 'ses_' prefix
   */
  @Field(() => ID)
  @PrimaryColumn()
  id!: string;

  /**
   * The user ID that this session belongs to
   */
  @Field(() => String)
  @Column()
  userId!: string;

  /**
   * The user that this session belongs to
   */
  @ManyToOne('User', { onDelete: 'CASCADE', lazy: true })
  user!: Promise<User>;

  /**
   * IP address from which the session was created
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  ipAddress?: MaybeNull<string>;

  /**
   * User agent string from the request
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  userAgent?: MaybeNull<string>;

  /**
   * When the session was created (login time)
   */
  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  createdAt!: Date;

  /**
   * When the session will expire (absolute max lifetime)
   */
  @Field(() => Date)
  @Column({ type: 'timestamptz', precision: 3 })
  expiresAt!: Date;

  /**
   * Last activity timestamp - used for sliding session extension
   */
  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
  lastActivityAt!: Date;
}
