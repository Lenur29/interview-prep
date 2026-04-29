import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

const AccountPage = lazy(() => import('./pages/account-page'));

export const usersRoutes: RouteObject[] = [{ path: RoutePath.Account, element: <AccountPage /> }];
