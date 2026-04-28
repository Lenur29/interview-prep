import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

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
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Public auth pages
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  // Authenticated app pages
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/topics', element: <TopicsPage /> },
  { path: '/topics/:topicSlug', element: <TopicPage /> },
  { path: '/questions/:questionSlug', element: <QuestionPage /> },
  { path: '/review', element: <ReviewPage /> },
  { path: '/notes', element: <NotesPage /> },
  { path: '/me', element: <AccountPage /> },

  // Fallback for any unmatched URL
  { path: '*', element: <NotFoundPage /> },
]);
