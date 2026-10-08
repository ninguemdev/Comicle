import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

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

  it('/sala/:code mostra o código da sala', () => {
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
});
