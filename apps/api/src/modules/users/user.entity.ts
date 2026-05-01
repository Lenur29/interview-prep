import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Image } from '@/modules/images/image.entity.js';
import { type ReadonlyResolvedPermission } from '@pcg/auth';
import { type MaybeNull } from '@pcg/predicates';
import { JSONObjectResolver } from 'graphql-scalars';
import { UserStatus, UserType } from './types/common.js';

@Entity('users')
@Index('idx_users_fullname_trgm', {
  synchronize: false,
})
@Index('idx_users_email_trgm', {
  synchronize: false,
})
@ObjectType()
export class User extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  @Field(() => UserStatus)
  @Index()
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Field(() => UserType)
  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.USER,
  })
  type!: UserType;

  get isDeleted(): boolean {
    return this.status === UserStatus.DELETED;
  }

  @Field()
  @Column()
  firstName!: string;

  @Field()
  @Column()
  lastName!: string;

  @Field(() => Image, {
    nullable: true,
  })
  @ManyToOne(() => Image, {
    lazy: true,
    nullable: true,
  })
  @JoinColumn({
    name: 'avatar_id',
  })
  avatar!: Promise<MaybeNull<Image>>;

  @Field(() => String, {
    nullable: true,
  })
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'avatar_id',
  })
  avatarId?: MaybeNull<string>;

  @Field()
  @Column({
    asExpression: `BTRIM(first_name || ' ' || last_name)`,
    generatedType: 'STORED',
  })
  fullName!: string;

  @Field()
  @Column({
    unique: true,
  })
  email!: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  passwordHash?: MaybeNull<string>;

  @Field(() => [JSONObjectResolver])
  resolvedPermissions: ReadonlyResolvedPermission[] = [];

  @Field(() => String, {
    nullable: true,
    description: 'SHA256 hash of current session ID (only for current user)',
  })
  sessionHash?: MaybeNull<string>;

  @Field(() => [String])
  @Column({
    type: 'jsonb',
    default: [],
  })
  permissions: string[] = [];

  @Column({
    type: 'varchar',
    nullable: true,
  })
  inviteToken?: MaybeNull<string>;

  /**
   * Represent Two-Factor Authentication status.
   * */
  @Field(() => Boolean, {
    nullable: true,
  })
  @Column({
    name: 'is_2fa_enabled',
    type: 'boolean',
    nullable: true,
  })
  is2faEnabled?: MaybeNull<boolean>;

  /**
   * Represent One-Time Password status.
   * */
  @Field(() => Boolean, {
    nullable: true,
  })
  @Column({
    name: 'is_otp_enabled',
    type: 'boolean',
    nullable: true,
  })
  isOtpEnabled?: MaybeNull<boolean>;

  /**
   * Keep One-Time Password secret.
   * */
  @Column({
    name: 'otp_secret',
    type: 'varchar',
    nullable: true,
  })
  otpSecret?: MaybeNull<string>;

  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  updatedAt!: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  fcmToken?: MaybeNull<string>;

  @Field()
  @Column({
    type: 'bool',
    default: false,
  })
  pushNotificationsEnabled!: boolean;

  @Field(() => String, {
    nullable: true,
  })
  @Column({
    type: 'varchar',
    nullable: true,
  })
  phoneNumber?: MaybeNull<string>;
}
