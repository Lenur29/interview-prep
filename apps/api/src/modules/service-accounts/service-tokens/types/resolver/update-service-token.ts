import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateServiceTokenInput {
  @Field()
  id!: string;

  /**
   * Service account token display name
   */
  @Field({
    nullable: true,
    description: 'Service account token display name (e.g. "Token01")',
  })
  name?: string;
}
