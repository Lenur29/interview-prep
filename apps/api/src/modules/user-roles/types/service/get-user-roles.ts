import { type ListMethodOptions } from '@/pagination/types.js';
import { type UserRolesFilter, type UserRolesOrderBy } from '../resolver/user-roles.js';

export interface FetchUserRolesOptions extends ListMethodOptions<UserRolesFilter, UserRolesOrderBy> {}
