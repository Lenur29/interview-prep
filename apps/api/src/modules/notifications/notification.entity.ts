import { Field, InterfaceType, ObjectType } from '@nestjs/graphql';
import { JSONObjectResolver } from 'graphql-scalars';
import {
  BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryColumn, TableInheritance,
} from 'typeorm';

import type { MaybeNull } from '@pcg/predicates';

import type { User } from '@/modules/users/user.entity.js';

import { NotificationStatus } from './types/common.js';

@ObjectType({
  isAbstract: true,
})
export abstract class NotificationMeta {}

@Entity('notifications')
@TableInheritance({
  column: {
    name: 'typeorm_type',
    type: 'varchar',
  },
})
@InterfaceType({
  resolveType(notification) {
    return notification.constructor.name;
  },
})
export class Notification extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  @Field(() => NotificationStatus)
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.QUEUED,
  })
  status!: NotificationStatus;

  @Field(() => String)
  get type() {
    return this.constructor.name;
  }

  @Field(() => String)
  @Column({
    type: 'varchar',
    default: 'SYSTEM',
  })
  group!: string;

  @Field()
  @Column()
  referenceId!: string;

  @Field()
  @Column({
    default: false,
  })
  isRead!: boolean;

  @Column({
    type: 'jsonb',
    default: {},
  })
  meta!: NotificationMeta;

  @Field(() => JSONObjectResolver)
  get metaJson() {
    return this.meta;
  }

  @Field(() => Date, {
    nullable: true,
  })
  @Column({
    nullable: true,
    type: 'timestamptz',
    precision: 3,
  })
  processedAt?: MaybeNull<Date>;

  @Field(() => String)
  @Column({
    type: 'varchar',
  })
  userId!: string;

  @ManyToOne('User', {
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user!: Promise<User>;

  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;
}
