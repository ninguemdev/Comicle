import { createBrowserRouter, type RouteObject } from 'react-router';

import { AppLayout } from './app-layout';
import { env } from './config/env';
import { NotFoundPage } from './features/errors/not-found-page';
import { ErrorPage } from './features/errors/error-page';
import { HomePage } from './features/home/home-page';
import { ProfilePage } from './features/profile/profile-page';
import { RoomPage } from './features/room/room-page';

/** `/dev/*` exists only in development; the import keeps it out of the production bundle. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/ui',
        lazy: async () => {
          const { DevUiPage } = await import('./features/dev-ui/dev-ui-page');
          return { Component: DevUiPage };
        },
      },
      {
        path: 'dev/editor',
        lazy: async () => {
          const { DevEditorPage } = await import('./features/drawing/dev-editor-page');
          return { Component: DevEditorPage };
        },
      },
      {
        path: 'dev/comic',
        lazy: async () => {
          const { DevComicPage } = await import('./features/comic/dev-comic-page');
          return { Component: DevComicPage };
        },
      },
    ]
  : [];

/** Routes of arquitetura §5; lobby, match and presentation are states of `/sala/:code`. */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: 'sala/:code', element: <RoomPage /> },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes, { basename: env.routerBasename });
}
