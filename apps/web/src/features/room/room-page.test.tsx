import { fail, type ErrorCode } from '@comicle/shared';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '../../router';
import { useProfileStore } from '../../stores/profile-store';
import { useRoomStore } from '../../stores/room-store';
import {
  lobbyView,
  matchView,
  member,
  mockRoomActions,
  ROOM_CODE,
  setUpStores,
} from '../../test/room-fixtures';

/** jsdom has no Clipboard API; each test decides whether there is one. */
function stubClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined) {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
}

function renderAt(path = `/sala/${ROOM_CODE}`) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('sala no cliente', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
    vi.unstubAllGlobals();
  });

  it('entra na sala ao conectar, com o código normalizado e o perfil salvo', () => {
    const actions = setUpStores(lobbyView());

    renderAt(`/sala/${ROOM_CODE.toLowerCase()}`);

    expect(actions.joinRoom).toHaveBeenCalledWith(ROOM_CODE, useProfileStore.getState().profile);
    expect(screen.getByRole('heading', { name: `Sala ${ROOM_CODE}` })).toBeInstanceOf(
      HTMLHeadingElement,
    );
  });

  it('R11, R12: anfitrião vê controles de configuração, expulsar e iniciar', () => {
    setUpStores(lobbyView());

    renderAt();

    expect(screen.getByRole('combobox', { name: 'Tempo por quadrinho' })).toBeInstanceOf(
      HTMLSelectElement,
    );
    expect(screen.getByRole('radio', { name: 'Fixa' })).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByRole('radio', { name: /Individual/ })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Expulsar Bia' })).toBeInstanceOf(HTMLButtonElement);
    expect(screen.queryByRole('button', { name: 'Expulsar Ana' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeInstanceOf(
      HTMLButtonElement,
    );
  });

  it('R11: quem não é anfitrião vê as configurações só para leitura', () => {
    setUpStores(lobbyView({ me: 'p2' }));

    renderAt();

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: /Expulsar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).toBeNull();
    expect(screen.getByText('1 min 30 s')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Só o anfitrião muda as configurações.')).toBeInstanceOf(HTMLElement);
  });

  it('R11: mudar uma configuração envia as configurações completas', () => {
    const actions = setUpStores(lobbyView());
    renderAt();

    fireEvent.change(screen.getByRole('combobox', { name: 'Tempo por quadrinho' }), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Fixa' }));

    expect(actions.updateSettings).toHaveBeenNthCalledWith(1, {
      mode: 'collaborative',
      panelCount: { kind: 'per_player' },
      drawingSeconds: 60,
    });
    expect(actions.updateSettings).toHaveBeenNthCalledWith(2, {
      mode: 'collaborative',
      panelCount: { kind: 'fixed', value: 4 },
      drawingSeconds: 90,
    });
  });

  it('R22: iniciar fica desabilitado com o motivo enquanto falta jogador conectado', () => {
    setUpStores(
      lobbyView({
        members: [member('p1', 'Ana', { isHost: true }), member('p2', 'Bia', { connected: false })],
      }),
    );

    renderAt();

    const start = screen.getByRole('button', { name: 'Iniciar partida' });
    expect(start).toHaveProperty('disabled', true);
    expect(screen.getByText('Precisa de pelo menos 2 jogadores.').id).toBe(
      start.getAttribute('aria-describedby'),
    );
  });

  it('com jogadores suficientes, iniciar chama a ação e mostra o erro devolvido', async () => {
    const actions = setUpStores(lobbyView());
    actions.startMatch.mockResolvedValue(fail('INVALID_STATE', ''));
    renderAt();

    const start = screen.getByRole('button', { name: 'Iniciar partida' });
    expect(start).toHaveProperty('disabled', false);
    fireEvent.click(start);

    expect(actions.startMatch).toHaveBeenCalledTimes(1);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Isso não pode ser feito agora.',
    );
  });

  it('R7: copiar convite copia {origem}{BASE_PATH}/sala/{CODIGO}', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard({ writeText });
    setUpStores(lobbyView());
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar convite' }));

    expect(await screen.findByText('Convite copiado!')).toBeInstanceOf(HTMLElement);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/sala/${ROOM_CODE}`);
    expect(screen.getByRole('textbox', { name: 'Link de convite' })).toHaveProperty(
      'value',
      `${window.location.origin}/sala/${ROOM_CODE}`,
    );
  });

  it('R7: sem Clipboard API, o link fica visível para copiar à mão', async () => {
    stubClipboard(undefined);
    setUpStores(lobbyView());
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar convite' }));

    expect(
      await screen.findByText('Não deu para copiar. Selecione o link e copie.'),
    ).toBeInstanceOf(HTMLElement);
  });

  it('R12: expulsar pede confirmação antes de enviar', () => {
    const actions = setUpStores(lobbyView());
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Expulsar Bia' }));
    const dialog = screen.getByRole('dialog', { name: 'Expulsar jogador?' });
    expect(actions.kick).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Expulsar' }));

    expect(actions.kick).toHaveBeenCalledWith('p2');
  });

  it('R15: sair da sala volta ao início', async () => {
    const actions = setUpStores(lobbyView());
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Sair da sala' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Comicle' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(actions.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it('R4: editar perfil leva à personalização com volta para a sala', () => {
    setUpStores(lobbyView());
    renderAt();

    expect(screen.getByRole('link', { name: 'Editar perfil' }).getAttribute('href')).toBe(
      `/perfil?next=%2Fsala%2F${ROOM_CODE}`,
    );
  });

  it.each<[ErrorCode, string]>([
    ['ROOM_NOT_FOUND', 'Sala não encontrada'],
    ['ROOM_FULL', 'Sala cheia'],
    ['KICKED', 'Você foi removido'],
    ['ROOM_CLOSED', 'Sala encerrada'],
    ['INTERNAL', 'Não deu para entrar'],
  ])('erro de entrada %s mostra a tela "%s" com volta ao início', async (code, title) => {
    const actions = mockRoomActions();
    actions.joinRoom.mockResolvedValue(fail(code, ''));
    setUpStores(null, actions);

    renderAt();

    expect(await screen.findByRole('heading', { name: title })).toBeInstanceOf(HTMLHeadingElement);
    expect(screen.getByRole('link', { name: 'Voltar ao início' }).getAttribute('href')).toBe('/');
  });

  it('erro inesperado oferece tentar de novo', async () => {
    const actions = mockRoomActions();
    actions.joinRoom.mockResolvedValueOnce(fail('INTERNAL', ''));
    setUpStores(lobbyView(), actions);
    renderAt();

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('heading', { name: `Sala ${ROOM_CODE}` })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(actions.joinRoom).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['kicked', 'Você foi removido'],
    ['closed', 'Sala encerrada'],
    ['replaced', 'Sala aberta em outro lugar'],
  ] as const)('R12, R16, R5: saída "%s" mostra a tela "%s"', (exit, title) => {
    setUpStores(lobbyView());
    renderAt();

    act(() => {
      useRoomStore.setState({ view: null, exit });
    });

    expect(screen.getByRole('heading', { name: title })).toBeInstanceOf(HTMLHeadingElement);
  });

  it('o título da aba acompanha a sala: código no lobby, fase na partida', () => {
    // The theme screen checks prefers-reduced-motion before rotating its examples.
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    setUpStores(lobbyView());
    renderAt();
    expect(document.title).toBe(`Sala ${ROOM_CODE} · Comicle`);

    act(() => {
      useRoomStore.setState({ view: matchView() });
    });
    expect(document.title).toBe('Temas · Comicle');
  });

  it('código mal formado mostra sala não encontrada sem tentar entrar', () => {
    const actions = setUpStores(null);

    renderAt('/sala/abc');

    expect(screen.getByRole('heading', { name: 'Sala não encontrada' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(actions.joinRoom).not.toHaveBeenCalled();
    expect(document.title).toBe('Sala não encontrada · Comicle');
  });

  it('R10: sala em partida mostra a tela de espectador a quem não joga', () => {
    setUpStores(matchView({ task: { kind: 'spectate' } }, 'p4'));

    renderAt();

    expect(screen.getByText('Partida em andamento: você entra na próxima.')).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.queryByRole('heading', { name: 'Configurações' })).toBeNull();
  });

  it('R7: convite aberto sem perfil passa pela personalização e depois entra', async () => {
    const actions = setUpStores(lobbyView());
    useProfileStore.setState({ saved: false });
    const router = renderAt();

    expect(screen.getByRole('heading', { name: 'Seu perfil' })).toBeInstanceOf(HTMLHeadingElement);
    expect(actions.joinRoom).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'Bia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('heading', { name: `Sala ${ROOM_CODE}` })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(router.state.location.pathname).toBe(`/sala/${ROOM_CODE}`);
    expect(actions.joinRoom).toHaveBeenCalledWith(
      ROOM_CODE,
      expect.objectContaining({ nickname: 'Bia' }),
    );
  });
});
