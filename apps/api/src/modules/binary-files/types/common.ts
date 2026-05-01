import {
  Field, InputType, Int, ObjectType,
} from '@nestjs/graphql';

@ObjectType()
@InputType('BinaryFileMetaInput')
export class BinaryFileMeta {
  /**
   * File size in bytes
   * @example 203452
   */
  @Field(() => Int, {
    nullable: true,
    description: 'File size in bytes (e.g. 203452)',
  })
  size?: number;

  /**
   * File mime type
   * @example 'application/pdf'
   */
  @Field(() => String, {
    nullable: true,
    description: 'File mime type (e.g. "application/pdf")',
  })
  mimeType?: string;

  /**
   * Orgiginal file name
   * @example 'my-file.pdf'
   */
  @Field(() => String, {
    nullable: true,
    description: 'Orgiginal file name (e.g. "my-file.pdf")',
  })
  name?: string;
}
