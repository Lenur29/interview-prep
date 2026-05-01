import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

const TopicsPage = lazy(() => import('./pages/topics-page'));
const TopicPage = lazy(() => import('./pages/topic-page'));

export const topicsRoutes: RouteObject[] = [
  { path: RoutePath.Topics, element: <TopicsPage /> },
  { path: RoutePath.Topic, element: <TopicPage /> },
];
