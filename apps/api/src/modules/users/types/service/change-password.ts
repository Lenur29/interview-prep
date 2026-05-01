import { InputType } from '@nestjs/graphql';

import { ChangePasswordInput } from '../resolver/index.js';

@InputType()
export class ChangePasswordOptions extends ChangePasswordInput {}
