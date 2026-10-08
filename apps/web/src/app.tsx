import { useEffect } from 'react';
import { RouterProvider } from 'react-router/dom';

import { bootAndConnect } from './boot';
import { createAppRouter } from './router';

const router = createAppRouter();

export function App() {
  useEffect(() => {
    void bootAndConnect();
  }, []);

  return <RouterProvider router={router} />;
}
