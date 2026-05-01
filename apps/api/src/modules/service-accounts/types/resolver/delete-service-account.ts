import {
  Field, InputType, ObjectType,
} from '@nestjs/graphql';

@InputType()
export class DeleteServiceAccountInput {
  @Field()
  id!: string;
}

@ObjectType()
export class DeleteServiceAccountPayload {
  @Field()
  id!: string;
}
