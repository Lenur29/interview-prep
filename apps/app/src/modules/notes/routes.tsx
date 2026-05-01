import { lazy } from 'react';
import type { RouteObject } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

const NotesPage = lazy(() => import('./pages/notes-page'));

export const notesRoutes: RouteObject[] = [{ path: RoutePath.Notes, element: <NotesPage /> }];
