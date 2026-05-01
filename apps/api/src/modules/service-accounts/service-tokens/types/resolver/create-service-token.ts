import type { MaybeNull } from '@pcg/predicates';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateServiceTokenInput {
  @Field()
  serviceAccountId!: string;

  @Field(() => String, {
    nullable: true,
  })
  name?: MaybeNull<string>;
}

// export interface ICreateServiceTokenPayload<ST extends BaseServiceToken> {
//   serviceToken: ST;
//   jwt: string;
// }
