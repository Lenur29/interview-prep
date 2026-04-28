import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';
import AppLayout from '@/widgets/app-layout';
import AuthLayout from '@/widgets/auth-layout';

const LoginPage = lazy(() => import('@/pages/login-page'));
const AuthCallbackPage = lazy(() => import('@/pages/auth-callback-page'));
const DashboardPage = lazy(() => import('@/pages/dashboard-page'));
const TopicsPage = lazy(() => import('@/pages/topics-page'));
const TopicPage = lazy(() => import('@/pages/topic-page'));
const QuestionPage = lazy(() => import('@/pages/question-page'));
const ReviewPage = lazy(() => import('@/pages/review-page'));
const NotesPage = lazy(() => import('@/pages/notes-page'));
const AccountPage = lazy(() => import('@/pages/account-page'));
const NotFoundPage = lazy(() => import('@/pages/not-found-page'));

export const router = createBrowserRouter([
  { path: RoutePath.Root, element: <Navigate to={RoutePath.Dashboard} replace /> },

  {
    element: <AuthLayout />,
    children: [
      { path: RoutePath.Login, element: <LoginPage /> },
      { path: RoutePath.AuthCallback, element: <AuthCallbackPage /> },
    ],
  },

  {
    element: <AppLayout />,
    children: [
      { path: RoutePath.Dashboard, element: <DashboardPage /> },
      { path: RoutePath.Topics, element: <TopicsPage /> },
      { path: RoutePath.Topic, element: <TopicPage /> },
      { path: RoutePath.Question, element: <QuestionPage /> },
      { path: RoutePath.Review, element: <ReviewPage /> },
      { path: RoutePath.Notes, element: <NotesPage /> },
      { path: RoutePath.Account, element: <AccountPage /> },
    ],
  },

  { path: RoutePath.NotFound, element: <NotFoundPage /> },
]);
