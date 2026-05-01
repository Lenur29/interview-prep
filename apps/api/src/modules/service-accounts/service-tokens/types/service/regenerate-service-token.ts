import type { ServiceToken } from '../../service-token.entity.js';

export interface RegenerateServiceTokenResult {
  serviceToken: ServiceToken;
  jwt: string;
}
