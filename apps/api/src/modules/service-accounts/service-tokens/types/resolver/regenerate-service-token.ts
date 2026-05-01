import { type ServiceToken } from '../../service-token.entity.js';

export interface IRegenerateServiceTokenPayload {
  serviceToken: ServiceToken;
  jwt: string;
}
