import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateServiceAccountInput {
  /**
   * Service account alias
   * @example 'backoffice'
   */
  @Field({
    description: 'Service account alias (e.g. "backoffice")',
  })
  alias!: string;

  /**
   * Service account display name
   * @example 'Backoffice App'
   */
  @Field({
    description: 'Service account display name (e.g. "Backoffice App")',
  })
  name!: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of custom permissions for service account',
  })
  permissions?: string[];

  /**
   * Client ID (for Apollo Studio)
   */
  @Field({
    nullable: true,
  })
  clientId?: string;
}

export interface ICreateServiceAccountPayload<U> {
  serviceAccount: U;
}
