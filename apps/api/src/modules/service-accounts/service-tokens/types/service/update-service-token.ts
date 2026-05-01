import { InputType } from '@nestjs/graphql';

import { UpdateServiceTokenInput } from '../resolver/index.js';

@InputType()
export class UpdateServiceTokenOptions extends UpdateServiceTokenInput {}
