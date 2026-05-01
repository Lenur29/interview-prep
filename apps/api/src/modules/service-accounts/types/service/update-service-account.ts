import { InputType } from '@nestjs/graphql';

import { UpdateServiceAccountInput } from '../resolver/update-service-account.js';

@InputType()
export class UpdateServiceAccountOptions extends UpdateServiceAccountInput {}
