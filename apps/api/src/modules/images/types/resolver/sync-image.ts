import { Field, InputType } from '@nestjs/graphql';
import { ImageRenditionType } from '../../image-renditions/types/common.js';
import { CreateImageRenditionMetaInput } from '../../image-renditions/types/resolver/create-image-rendition.js';

@InputType()
export class SyncImageRenditionInImageInput {
  @Field()
  id!: string;

  @Field(() => ImageRenditionType)
  type!: ImageRenditionType;

  @Field(() => CreateImageRenditionMetaInput)
  meta!: CreateImageRenditionMetaInput;

  @Field()
  url!: string;
}

@InputType()
export class SyncImageInput {
  @Field()
  id!: string;

  @Field(() => [SyncImageRenditionInImageInput], {
    nullable: true,
  })
  renditions?: SyncImageRenditionInImageInput[];
}
