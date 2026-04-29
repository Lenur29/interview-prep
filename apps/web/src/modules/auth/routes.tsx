import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

const LoginPage = lazy(() => import('./pages/login-page'));
const AuthCallbackPage = lazy(() => import('./pages/auth-callback-page'));

export const authRoutes: RouteObject[] = [
  { path: RoutePath.Login, element: <LoginPage /> },
  { path: RoutePath.AuthCallback, element: <AuthCallbackPage /> },
];
