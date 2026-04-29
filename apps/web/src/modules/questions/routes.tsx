import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

const QuestionPage = lazy(() => import('./pages/question-page'));

export const questionsRoutes: RouteObject[] = [
  { path: RoutePath.Question, element: <QuestionPage /> },
];
