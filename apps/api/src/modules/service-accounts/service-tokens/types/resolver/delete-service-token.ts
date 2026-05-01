import {
  Field, InputType, ObjectType,
} from '@nestjs/graphql';

@InputType()
export class DeleteServiceTokenInput {
  @Field()
  id!: string;
}

@ObjectType()
export class DeleteServiceTokenPayload {
  @Field()
  id!: string;
}
