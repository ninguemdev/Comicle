import { defaultAvatar, NICKNAME_MAX_LENGTH } from '@comicle/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS } from '../../lib/storage';
import { routes } from '../../router';
import { useProfileStore } from '../../stores/profile-store';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

function typeNickname(value: string) {
  fireEvent.change(screen.getByLabelText('Apelido'), { target: { value } });
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
}

describe('tela de perfil', () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: { nickname: '', avatar: defaultAvatar() }, saved: false });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('R1: nickname vazio mostra erro e bloqueia salvar', () => {
    renderAt('/perfil');

    clickSave();

    expect(screen.getByRole('alert').textContent).toBe('Escolha um apelido.');
    expect(useProfileStore.getState().saved).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Seu perfil' })).toBeInstanceOf(HTMLHeadingElement);
  });

  it('R1: nickname longo demais mostra erro ao digitar e bloqueia salvar', () => {
    renderAt('/perfil');

    typeNickname('a'.repeat(NICKNAME_MAX_LENGTH + 1));

    expect(screen.getByRole('alert').textContent).toBe('Use no máximo 20 caracteres.');
    expect(screen.getByLabelText('Apelido').getAttribute('aria-invalid')).toBe('true');

    clickSave();

    expect(useProfileStore.getState().saved).toBe(false);
  });

  it('R1, R4: salva nickname normalizado e avatar, e volta para ?next=', async () => {
    renderAt('/perfil?next=/sala/K7PQ2M');

    typeNickname('  Ana   Bia ');
    fireEvent.click(screen.getByRole('tab', { name: 'Olhos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arregalados' }));
    clickSave();

    // The room screen waits for the socket, which this test does not open.
    expect(await screen.findByText('Entrando na sala…')).toBeInstanceOf(HTMLElement);
    const expected = { nickname: 'Ana Bia', avatar: { ...defaultAvatar(), eyes: 'eyes-wide' } };
    expect(useProfileStore.getState().profile).toEqual(expected);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.profile) ?? 'null')).toEqual(
      expected,
    );
  });

  it('?next= para fora do jogo volta para o início', async () => {
    renderAt('/perfil?next=//exemplo.com');

    typeNickname('Ana');
    clickSave();

    expect(await screen.findByRole('heading', { level: 1, name: 'Comicle' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
  });

  it('abre com o perfil salvo e Cancelar volta sem salvar', async () => {
    useProfileStore.setState({
      profile: { nickname: 'Bia', avatar: defaultAvatar() },
      saved: true,
    });
    renderAt('/perfil');

    expect(screen.getByLabelText<HTMLInputElement>('Apelido').value).toBe('Bia');

    typeNickname('Outra');
    fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Comicle' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(useProfileStore.getState().profile.nickname).toBe('Bia');
  });
});
