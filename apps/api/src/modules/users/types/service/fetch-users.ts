import { type ListMethodOptions } from '@/pagination/types.js';
import { type UsersFilter, type UsersOrderBy } from '../resolver/index.js';

export interface FetchUsersOptions extends ListMethodOptions<UsersFilter, UsersOrderBy> {}
