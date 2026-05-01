import { InputType } from '@nestjs/graphql';

import { CreateServiceAccountInput } from '../resolver/create-service-account.js';

@InputType()
export class CreateServiceAccountOptions extends CreateServiceAccountInput {}
