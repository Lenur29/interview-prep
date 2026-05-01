import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class FetchServiceTokenInput {
  @Field()
  id!: string;
}
