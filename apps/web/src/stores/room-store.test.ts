import type { PlayerView, ServerToClientEvents } from '@comicle/shared';
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
  let viewListener: ServerToClientEvents['room:view'] | null = null;
  const client = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnectWithToken: vi.fn(),
    emitWithAck: vi.fn((event: string, payload: { clientSentAt: number }) =>
      Promise.resolve(
        event === 'time:sync'
          ? { ok: true, data: { clientSentAt: payload.clientSentAt, serverNow: 5000 } }
          : { ok: false, error: { code: 'INTERNAL', message: '' } },
      ),
    ),
    on: vi.fn((event: string, listener: ServerToClientEvents['room:view']) => {
      if (event === 'room:view') {
        viewListener = listener;
      }
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
    pushView: (view: PlayerView) => viewListener?.(view),
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
});
