import { fail } from '@comicle/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { routes } from '../../router';
import { useProfileStore } from '../../stores/profile-store';
import { mockRoomActions, ROOM_CODE, setUpStores } from '../../test/room-fixtures';

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('tela inicial', () => {
  it('mostra o perfil atual com atalho para editar', () => {
    setUpStores(null);
    renderHome();

    expect(screen.getByRole('img', { name: 'Avatar de Ana' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('link', { name: 'Editar perfil' }).getAttribute('href')).toBe(
      '/perfil?next=%2F',
    );
  });

  it('R6: o campo de código normaliza para maiúsculas e ignora caracteres inválidos', () => {
    setUpStores(null);
    renderHome();
    const input = screen.getByRole('textbox', { name: 'Código da sala' });
    const join = screen.getByRole('button', { name: 'Entrar' });

    fireEvent.change(input, { target: { value: 'k7 pq' } });
    expect(input).toHaveProperty('value', 'K7PQ');
    expect(join).toHaveProperty('disabled', true);

    fireEvent.change(input, { target: { value: 'k7 pq-2m0oil' } });
    expect(input).toHaveProperty('value', ROOM_CODE);
    expect(join).toHaveProperty('disabled', false);
  });

  it('entrar com o código abre a sala', async () => {
    const actions = setUpStores(null);
    const router = renderHome();

    fireEvent.change(screen.getByRole('textbox', { name: 'Código da sala' }), {
      target: { value: ROOM_CODE },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Entrando na sala…')).toBeInstanceOf(HTMLElement);
    expect(router.state.location.pathname).toBe(`/sala/${ROOM_CODE}`);
    expect(actions.joinRoom).toHaveBeenCalledWith(ROOM_CODE, useProfileStore.getState().profile);
  });

  it('R8: criar sala envia o perfil e abre a sala criada', async () => {
    const actions = setUpStores(null);
    const router = renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Criar sala' }));

    expect(await screen.findByText('Entrando na sala…')).toBeInstanceOf(HTMLElement);
    expect(actions.createRoom).toHaveBeenCalledWith(useProfileStore.getState().profile);
    expect(router.state.location.pathname).toBe(`/sala/${ROOM_CODE}`);
  });

  it('R4: sem perfil salvo, criar sala leva à personalização', async () => {
    const actions = setUpStores(null);
    useProfileStore.setState({ saved: false });
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Criar sala' }));

    expect(await screen.findByRole('heading', { name: 'Seu perfil' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(actions.createRoom).not.toHaveBeenCalled();
  });

  it('erro ao criar sala aparece como aviso', async () => {
    const actions = mockRoomActions();
    actions.createRoom.mockResolvedValue(fail('RATE_LIMITED', ''));
    setUpStores(null, actions);
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Criar sala' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Calma!');
  });
});
