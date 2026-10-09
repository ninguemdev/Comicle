import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppLayout } from './app-layout';
import { ErrorPage } from './features/errors/error-page';
import { routes } from './router';
import { lobbyView, setUpStores } from './test/room-fixtures';

function renderAt(path: string, routeList: RouteObject[] = routes) {
  const router = createMemoryRouter(routeList, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

function Boom(): never {
  throw new Error('quebrou');
}

/** The app's layout and error page around a screen that crashes. */
const crashingRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [{ path: 'quebra', element: <Boom /> }],
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rotas', () => {
  it('/ mostra a tela inicial', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Comicle' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
  });

  it('/perfil mostra a personalização', () => {
    renderAt('/perfil');

    expect(screen.getByRole('heading', { name: 'Seu perfil' })).toBeInstanceOf(HTMLHeadingElement);
  });

  it('/sala/:code mostra a sala', () => {
    setUpStores(lobbyView());
    renderAt('/sala/K7PQ2M');

    expect(screen.getByRole('heading', { name: 'Sala K7PQ2M' })).toBeInstanceOf(HTMLHeadingElement);
  });

  it('rota desconhecida mostra a página 404 com caminho de volta', () => {
    renderAt('/nao-existe');

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(screen.getByRole('link', { name: 'Voltar ao início' }).getAttribute('href')).toBe('/');
  });

  it('/dev/ui mostra a vitrine de componentes em desenvolvimento', async () => {
    renderAt('/dev/ui');

    expect(await screen.findByRole('heading', { name: 'Componentes' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
  });

  it.each([
    ['/', 'Comicle'],
    ['/perfil', 'Seu perfil · Comicle'],
    ['/nao-existe', 'Página não encontrada · Comicle'],
  ])('%s tem o título "%s"', (path, title) => {
    renderAt(path);

    expect(document.title).toBe(title);
  });

  it('uma tela que quebra mostra a página de erro com volta ao início', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    renderAt('/quebra', crashingRoutes);

    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toBeInstanceOf(
      HTMLAnchorElement,
    );
    expect(document.title).toBe('Algo deu errado · Comicle');
  });
});
