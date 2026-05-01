import { Field, InputType } from '@nestjs/graphql';

import { ImageRenditionType } from '../../image-renditions/types/common.js';
import { CreateImageRenditionMetaInput } from '../../image-renditions/types/resolver/create-image-rendition.js';

@InputType()
export class ImageRenditionInput {
  /**
   * Image rendition id (e.g. 'hcimgr:289gjfhslertu')
   * Is optional because it is generated automatically
   */
  @Field({
    nullable: true,
    description: 'Image rendition id (e.g. "hcimgr:289gjfhslertu"). Is optional because it is generated automatically',
  })
  id?: string;

  /**
   * Image rendition type for different image sizes (e.g. "MAIN")
   */
  @Field(() => ImageRenditionType, {
    description: 'Image rendition type for different image sizes (e.g. "MAIN")',
  })
  type!: ImageRenditionType;

  /**
   * Rendition metadata
   */
  @Field(() => CreateImageRenditionMetaInput)
  meta!: CreateImageRenditionMetaInput;

  /**
   * Rendition url
   * @example 'https://cdn.holistic-cms.com/289gjfhslertu.jpg'
   */
  @Field({
    description: 'Image file url (e.g. "https://cdn.holistic-cms.com/289gjfhslertu.jpg")',
  })
  url!: string;
}

@InputType()
export class CreateImageInput {
  /**
   * Image id (e.g. 'hcimg:289gjfhslertu')
   * Is optional because it is generated automatically
   */
  @Field({
    nullable: true,
    description: 'Image id (e.g. "hcimg:289gjfhslertu"). Is optional because it is generated automatically',
  })
  id?: string;

  /**
   * Image renditions. Each rendition is a different size of the same image
   */
  @Field(() => [ImageRenditionInput], {
    nullable: true,
    description: 'Each rendition is a different size of the same image',
  })
  renditions?: ImageRenditionInput[];
}
