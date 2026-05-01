import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import { authRoutes } from '@/modules/auth/routes';
import { dashboardRoutes } from '@/modules/dashboard/routes';
import { notesRoutes } from '@/modules/notes/routes';
import { questionsRoutes } from '@/modules/questions/routes';
import { reviewRoutes } from '@/modules/review/routes';
import { topicsRoutes } from '@/modules/topics/routes';
import { usersRoutes } from '@/modules/users/routes';
import { RoutePath } from '@/shared/config/router/constants';

const NotFoundPage = lazy(() => import('./not-found-page'));

export const router = createBrowserRouter([
  { path: RoutePath.Root, element: <Navigate to={RoutePath.Dashboard} replace /> },

  {
    element: <AuthLayout />,
    children: authRoutes,
  },

  {
    element: <AppLayout />,
    children: [
      ...dashboardRoutes,
      ...usersRoutes,
      ...topicsRoutes,
      ...questionsRoutes,
      ...reviewRoutes,
      ...notesRoutes,
    ],
  },

  { path: RoutePath.NotFound, element: <NotFoundPage /> },
]);
