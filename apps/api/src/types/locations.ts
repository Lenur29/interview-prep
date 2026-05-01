import { registerEnumType, ObjectType, InputType, Field, InterfaceType } from '@nestjs/graphql';

export enum FileLocationType {
  S3 = 's3',
  CUSTOM = 'custom',
}

registerEnumType(FileLocationType, {
  name: 'FileLocationType',
});

@ObjectType('S3FileLocation')
@InputType('S3FileLocationInput')
export class S3FileLocation {
  @Field(() => FileLocationType)
  type!: FileLocationType.S3;

  @Field()
  bucket!: string;

  @Field()
  path!: string;

  @Field({ nullable: true })
  region?: string;
}

@ObjectType('CustomFileLocation')
@InputType('CustomFileLocationInput')
export class CustomFileLocation {
  @Field(() => FileLocationType)
  type!: FileLocationType.CUSTOM;

  @Field()
  url!: string;
}

@InterfaceType({
  resolveType(target) {
    if (isS3FileLocation(target)) {
      return S3FileLocation;
    } else if (isCustomFileLocation(target)) {
      return CustomFileLocation;
    }
  },
})
export class FileLocation {
  /**
   * Each location has unique type (FTP, GoogleStorage etc.)
   */
  @Field(() => FileLocationType)
  type!: FileLocationType;
}

export function isS3FileLocation(location: FileLocation): location is S3FileLocation {
  return location.type === FileLocationType.S3;
}

export function isCustomFileLocation(location: FileLocation): location is CustomFileLocation {
  return location.type === FileLocationType.CUSTOM;
}
