import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateServiceAccountInput {
  @Field()
  id!: string;

  /**
   * Service account display name
   */
  @Field({
    nullable: true,
    description: 'Service account display name (e.g. "Worker")',
  })
  name?: string;
}
