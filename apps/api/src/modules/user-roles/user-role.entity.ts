import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { SystemRole } from '@/permissions/roles.js';
import { type MaybeNull } from '@pcg/predicates';

import { type User } from '@/modules/users/user.entity.js';

@ObjectType()
@Entity('user_roles')
export class UserRole extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  @Field()
  @Column({ type: 'varchar', unique: true })
  userId!: string;

  @ManyToOne('User', { lazy: true, onDelete: 'CASCADE' })
  user!: Promise<MaybeNull<User>>;

  @Field(() => SystemRole)
  @Column({ type: 'enum', enum: SystemRole })
  roleId!: SystemRole;

  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;

  @Field()
  @UpdateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  updatedAt!: Date;
}
