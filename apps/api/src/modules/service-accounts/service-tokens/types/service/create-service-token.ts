import type { ServiceToken } from '../../service-token.entity.js';
import { CreateServiceTokenInput } from '../resolver/index.js';

export class CreateServiceTokenOptions extends CreateServiceTokenInput {}
export interface CreateServiceTokenResult {
  serviceToken: ServiceToken;
  jwt: string;
}
