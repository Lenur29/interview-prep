import { Field, InputType } from '@nestjs/graphql';
import { IsUrl, MinLength } from 'class-validator';

import { BinaryFileMeta } from '../common.js';

@InputType()
export class CreateBinaryFileInput {
  /**
   * Optional file ID
   */
  @Field({
    nullable: true,
    description: 'Optional file ID, generated if not provided',
  })
  id?: string;

  /**
   * File metadata
   */
  @Field(() => BinaryFileMeta)
  meta!: BinaryFileMeta;

  /**
   * URL to the file
   */
  @Field(() => String, {
    description: 'URL to the file',
  })
  @IsUrl()
  @MinLength(1)
  url!: string;

  /**
   * File description
   */
  @Field({
    nullable: true,
  })
  description?: string;

  /**
   * Whether the file is private and requires signed URL to access
   */
  @Field({
    description: 'Whether the file is private and requires signed URL to access',
    nullable: true,
  })
  isPrivate?: boolean;
}
