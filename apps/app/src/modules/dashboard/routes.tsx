import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

const DashboardPage = lazy(() => import('./pages/dashboard-page'));

export const dashboardRoutes: RouteObject[] = [
  { path: RoutePath.Dashboard, element: <DashboardPage /> },
];
