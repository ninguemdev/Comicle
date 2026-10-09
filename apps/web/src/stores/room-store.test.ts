import { defaultAvatar, type PlayerView, type ServerToClientEvents } from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SocketClient, SocketClientOptions } from '../lib/socket-client';
import { createRoomStore } from './room-store';

const VIEW: PlayerView = {
  serverNow: 1000,
  room: {
    code: 'K7PQ2M',
    status: 'lobby',
    hostPlayerId: 'p1',
    settings: { mode: 'collaborative', panelCount: { kind: 'per_player' }, drawingSeconds: 90 },
    members: [],
  },
  me: { playerId: 'p1', isHost: true, role: 'member' },
  match: null,
};

/** Records what the store does with the socket and lets the test play the server. */
function fakeSocket() {
  let options: SocketClientOptions | null = null;
  const server: {
    view?: ServerToClientEvents['room:view'];
    removed?: ServerToClientEvents['room:removed'];
    replaced?: ServerToClientEvents['session:replaced'];
    collect?: ServerToClientEvents['round:collect'];
    aborted?: ServerToClientEvents['match:aborted'];
  } = {};
  const client = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnectWithToken: vi.fn(),
    emitWithAck: vi.fn((event: string, payload: { clientSentAt?: number }) =>
      Promise.resolve(
        event === 'time:sync'
          ? { ok: true, data: { clientSentAt: payload.clientSentAt, serverNow: 5000 } }
          : { ok: true, data: {} },
      ),
    ),
    // `never`: the store passes the listener typed for each event.
    on: vi.fn((event: keyof ServerToClientEvents, listener: never) => {
      if (event === 'room:view') server.view = listener;
      if (event === 'room:removed') server.removed = listener;
      if (event === 'session:replaced') server.replaced = listener;
      if (event === 'round:collect') server.collect = listener;
      if (event === 'match:aborted') server.aborted = listener;
      return () => undefined;
    }),
  } satisfies Record<keyof SocketClient, unknown>;

  return {
    client,
    create: (created: SocketClientOptions) => {
      options = created;
      // The fake implements only what the store calls; its loose signatures stand in for the generic ones.
      return client as unknown as SocketClient;
    },
    options: () => {
      if (options === null) throw new Error('socket não criado');
      return options;
    },
    pushView: (view: PlayerView) => server.view?.(view),
    server,
  };
}

describe('room-store', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('guarda a última PlayerView recebida', () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });

    store.getState().actions.connect('tok');
    socket.pushView(VIEW);

    expect(store.getState().view).toBe(VIEW);
    expect(socket.client.connect).toHaveBeenCalledTimes(1);
  });

  it('conecta uma vez só por página', () => {
    const socket = fakeSocket();
    const create = vi.fn(socket.create);
    const store = createRoomStore({ createSocketClient: create, renewSession: vi.fn() });

    store.getState().actions.connect('tok');
    store.getState().actions.connect('tok');

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('depois de desistir (offline), conectar de novo reconecta com o token dado', () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');

    socket.options().onStatusChange('offline');
    store.getState().actions.connect('tok-atual');

    expect(socket.client.reconnectWithToken).toHaveBeenCalledWith('tok-atual');
    expect(store.getState().connection).toBe('connecting');
  });

  it('acompanha o status e mede o relógio do servidor ao conectar', async () => {
    vi.useFakeTimers({ now: 1000 });
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');

    socket.options().onStatusChange('connected');
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getState().connection).toBe('connected');
    // Instant round trip at local 1000 with server at 5000.
    expect(store.getState().clockOffsetMs).toBe(4000);

    socket.options().onStatusChange('reconnecting');
    expect(store.getState().connection).toBe('reconnecting');
  });

  it('R3: token recusado pelo socket gera sessão nova e reconecta com ela', async () => {
    const socket = fakeSocket();
    const renewSession = vi.fn(() => Promise.resolve('novo'));
    const store = createRoomStore({ createSocketClient: socket.create, renewSession });
    store.getState().actions.connect('velho');

    socket.options().onUnauthorized();
    await vi.waitFor(() => {
      expect(socket.client.reconnectWithToken).toHaveBeenCalledWith('novo');
    });
  });

  it('fica offline se não conseguir sessão nova', async () => {
    const socket = fakeSocket();
    const store = createRoomStore({
      createSocketClient: socket.create,
      renewSession: () => Promise.resolve(null),
    });
    store.getState().actions.connect('velho');

    socket.options().onUnauthorized();
    await vi.waitFor(() => {
      expect(store.getState().connection).toBe('offline');
    });
  });

  it('ações da sala emitem o evento certo e devolvem o ack', async () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');
    const profile = { nickname: 'Ana', avatar: defaultAvatar() };
    const { actions } = store.getState();

    await actions.createRoom(profile);
    await actions.joinRoom('K7PQ2M', profile);
    await actions.kick('p2');
    await actions.updateSettings({
      ...VIEW.room.settings,
      mode: 'collaborative',
      drawingSeconds: 60,
    });
    expect(await actions.startMatch()).toEqual({ ok: true, data: {} });

    expect(socket.client.emitWithAck.mock.calls.map(([event]) => event)).toEqual([
      'room:create',
      'room:join',
      'room:kick',
      'room:updateSettings',
      'match:start',
    ]);
    expect(socket.client.emitWithAck).toHaveBeenCalledWith('room:join', {
      roomCode: 'K7PQ2M',
      profile,
    });
  });

  it('sair da sala apaga a view', async () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');
    socket.pushView(VIEW);

    await store.getState().actions.leaveRoom();

    expect(store.getState().view).toBeNull();
  });

  it('R12, R16, R5: room:removed e session:replaced apagam a view e guardam o motivo', async () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');

    for (const reason of ['kicked', 'closed'] as const) {
      socket.pushView(VIEW);
      socket.server.removed?.({ reason });
      expect(store.getState()).toMatchObject({ view: null, exit: reason });
    }
    socket.server.replaced?.({});
    expect(store.getState().exit).toBe('replaced');

    await store.getState().actions.joinRoom('K7PQ2M', { nickname: 'Ana', avatar: defaultAvatar() });
    expect(store.getState().exit).toBeNull();
  });

  it('ação sem socket responde com erro em vez de travar', async () => {
    const store = createRoomStore({
      createSocketClient: fakeSocket().create,
      renewSession: vi.fn(),
    });

    expect(await store.getState().actions.leaveRoom()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL' },
    });
  });

  it('ações da partida emitem o evento certo', async () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');
    const { actions } = store.getState();
    const png = new Uint8Array([1]);

    await actions.abortMatch();
    await actions.draftTheme('Um gato');
    await actions.submitTheme('Um gato');
    await actions.confirmReading(1);
    await actions.autosavePanel(1, png);
    await actions.submitPanel(1, 'timeout', null);

    expect(socket.client.emitWithAck.mock.calls).toEqual([
      ['match:abort', {}],
      ['theme:draft', { text: 'Um gato' }],
      ['theme:submit', { text: 'Um gato' }],
      ['round:ready', { roundIndex: 1 }],
      ['panel:autosave', { roundIndex: 1, png }],
      ['panel:submit', { roundIndex: 1, reason: 'timeout', png: null }],
    ]);
  });

  it('R42, R57: round:collect e match:aborted viram sinais numerados, mesmo repetidos', () => {
    const socket = fakeSocket();
    const store = createRoomStore({ createSocketClient: socket.create, renewSession: vi.fn() });
    store.getState().actions.connect('tok');

    socket.server.collect?.({ roundIndex: 2 });
    const first = store.getState().collect;
    socket.server.collect?.({ roundIndex: 2 });
    const second = store.getState().collect;
    socket.server.aborted?.({ reason: 'persistence_failed' });

    expect(first?.payload).toEqual({ roundIndex: 2 });
    expect(second?.seq).toBeGreaterThan(first?.seq ?? Infinity);
    expect(store.getState().matchAborted?.payload).toEqual({ reason: 'persistence_failed' });
  });
});
