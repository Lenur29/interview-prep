import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class DeleteUserRoleInput {
  @Field()
  id!: string;
}

@ObjectType()
export class DeleteUserRolePayload {
  @Field()
  id!: string;
}
