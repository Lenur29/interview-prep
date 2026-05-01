import { type ListMethodOptions } from '@/pagination/types.js';

import { type ServiceTokensFilter, type ServiceTokensOrderBy } from '../resolver/index.js';

export interface GetManyServiceTokensOptions extends ListMethodOptions<ServiceTokensFilter, ServiceTokensOrderBy> {}
