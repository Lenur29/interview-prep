import {
  Field, InputType, Int,
} from '@nestjs/graphql';

@InputType()
export class CreateBinaryFileSignerUrlOptions {
  @Field()
  id!: string;

  /**
   * URL expiration time in milliseconds
   */
  @Field(() => Int)
  ttl!: number;
}
