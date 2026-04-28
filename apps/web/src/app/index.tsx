import { Suspense } from 'react';
import { RouterProvider } from 'react-router';

import { router } from './router';

export const App = () => {
  return (
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  );
};
