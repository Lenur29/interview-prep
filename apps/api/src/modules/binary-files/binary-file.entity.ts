import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MaybeNull } from '@pcg/predicates';

import {
  getS3FileUrl,
} from '@/tools/locations.js';

import { BinaryFileMeta } from './types/common.js';
import { FileLocation, isS3FileLocation, isCustomFileLocation } from '@/types/locations.js';

@ObjectType()
@Entity('files')
export class BinaryFile extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  /**
   * File location. Can be an S3-compatible storage or a custom URL
   */
  @Field(() => FileLocation, {
    description: 'File location. Can be an S3-compatible storage or a custom URL',
  })
  @Column({
    type: 'jsonb',
  })
  location!: FileLocation;

  @Field({
    description: 'Whether the file is private and requires signed URL to access',
  })
  @Column({
    type: 'boolean',
    default: false,
  })
  isPrivate!: boolean;

  /**
   * Raw location URL. Public files: directly accessible.
   * Private files: blocked by bucket policy — use the `url` / `downloadUrl`
   * GraphQL fields (resolved by BinaryFilesResolver) to obtain signed URLs.
   */
  get url(): MaybeNull<string> {
    if (isS3FileLocation(this.location)) {
      return getS3FileUrl(this.location);
    }

    if (isCustomFileLocation(this.location)) {
      return this.location.url;
    }

    return null;
  }

  /**
   * File metadata
   */
  @Field(() => BinaryFileMeta)
  @Column({
    type: 'jsonb',
  })
  meta!: BinaryFileMeta;

  /**
   * Date when the file was created
   */
  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;

  /**
   * Date when the file was last updated
   */
  @Field()
  @UpdateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  updatedAt!: Date;

  /**
   * Date when the file was soft-deleted
   */
  @Field({
    description: 'Date when the file was soft-deleted',
    nullable: true,
  })
  @DeleteDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  deletedAt?: Date;

  @Field(() => String, {
    nullable: true,
  })
  @Column({
    type: 'varchar',
    nullable: true,
  })
  description?: string | null;
}
