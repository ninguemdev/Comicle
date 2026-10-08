import {
  fail,
  type Ack,
  type ClientEventAckData,
  type ClientEventName,
  type ClientEventPayload,
  type Empty,
  type PlayerProfile,
  type PlayerView,
  type RoomRemovedReason,
} from '@comicle/shared';
import { create } from 'zustand';

import { env } from '../config/env';
import {
  createSocketClient,
  type ConnectionStatus,
  type SocketClient,
  type SocketClientOptions,
} from '../lib/socket-client';
import { startTimeSync, type TimeSample } from '../lib/time-sync';
import { strings } from '../strings/pt-BR';
import { useSessionStore } from './session-store';

/** Settings the server accepts in v1 (only the collaborative mode, R21). */
export type SettingsInput = ClientEventPayload<'room:updateSettings'>['settings'];

/** Why the player is no longer in the room: removed by the server or replaced by another tab (R5). */
export type RoomExit = RoomRemovedReason | 'replaced';

interface RoomState {
  /** Last `room:view`: the only source of game state on the client (arquitetura §5). */
  view: PlayerView | null;
  /** Set by `room:removed` and `session:replaced`; cleared by the next create or join. */
  exit: RoomExit | null;
  connection: ConnectionStatus;
  /** Server clock minus local clock (protocolo §6). */
  clockOffsetMs: number;
  actions: {
    /**
     * Opens the socket once per page. Later calls only matter after the connection gave up
     * (`offline`): they retry with the given token.
     */
    connect(token: string): void;
    createRoom(profile: PlayerProfile): Promise<Ack<{ roomCode: string }>>;
    /** Also re-enters a room the player is already in (reconnection, edited profile). */
    joinRoom(roomCode: string, profile: PlayerProfile): Promise<Ack<{ roomCode: string }>>;
    leaveRoom(): Promise<Ack<Empty>>;
    kick(playerId: string): Promise<Ack<Empty>>;
    updateSettings(settings: SettingsInput): Promise<Ack<Empty>>;
    startMatch(): Promise<Ack<Empty>>;
  };
}

export interface RoomStoreDeps {
  createSocketClient(options: SocketClientOptions): SocketClient;
  /** New session token after the server refused the current one, or `null` on failure. */
  renewSession(): Promise<string | null>;
}

export function createRoomStore(deps: RoomStoreDeps) {
  let client: SocketClient | null = null;
  let stopTimeSync: (() => void) | null = null;

  return create<RoomState>()((set, get) => {
    async function requestTimeSample(socket: SocketClient): Promise<TimeSample | null> {
      const clientSentAt = Date.now();
      const ack = await socket.emitWithAck('time:sync', { clientSentAt });
      return ack.ok
        ? { clientSentAt, serverNow: ack.data.serverNow, receivedAt: Date.now() }
        : null;
    }

    function handleStatus(status: ConnectionStatus): void {
      set({ connection: status });
      stopTimeSync?.();
      stopTimeSync = null;
      if (status === 'connected' && client !== null) {
        const socket = client;
        // Measured on every (re)connection, as the network path may have changed.
        stopTimeSync = startTimeSync({
          requestSample: () => requestTimeSample(socket),
          onOffset: (clockOffsetMs) => {
            set({ clockOffsetMs });
          },
        });
      }
    }

    function emit<E extends ClientEventName>(
      event: E,
      payload: ClientEventPayload<E>,
    ): Promise<Ack<ClientEventAckData[E]>> {
      if (client === null) {
        return Promise.resolve(fail('INTERNAL', strings.connection.offline));
      }
      return client.emitWithAck(event, payload);
    }

    function leftRoom(exit: RoomExit): void {
      set({ view: null, exit });
    }

    async function handleUnauthorized(): Promise<void> {
      const token = await deps.renewSession();
      if (token === null) {
        set({ connection: 'offline' });
        return;
      }
      client?.reconnectWithToken(token);
    }

    return {
      view: null,
      exit: null,
      connection: 'connecting',
      clockOffsetMs: 0,
      actions: {
        connect(token) {
          if (client !== null) {
            if (get().connection === 'offline') {
              set({ connection: 'connecting' });
              client.reconnectWithToken(token);
            }
            return;
          }
          client = deps.createSocketClient({
            serverUrl: env.serverUrl,
            token,
            onStatusChange: handleStatus,
            onUnauthorized: () => void handleUnauthorized(),
          });
          client.on('room:view', (view) => {
            set({ view });
          });
          client.on('room:removed', ({ reason }) => {
            leftRoom(reason);
          });
          client.on('session:replaced', () => {
            leftRoom('replaced');
          });
          client.connect();
        },
        createRoom(profile) {
          set({ exit: null });
          return emit('room:create', { profile });
        },
        joinRoom(roomCode, profile) {
          set({ exit: null });
          return emit('room:join', { roomCode, profile });
        },
        async leaveRoom() {
          const ack = await emit('room:leave', {});
          if (ack.ok) {
            set({ view: null });
          }
          return ack;
        },
        kick(playerId) {
          return emit('room:kick', { playerId });
        },
        updateSettings(settings) {
          return emit('room:updateSettings', { settings });
        },
        // The server handles `match:start` from T11 on; until then the ack reports the failure.
        startMatch() {
          return emit('match:start', {});
        },
      },
    };
  });
}

export const useRoomStore = createRoomStore({
  createSocketClient,
  renewSession: () => useSessionStore.getState().actions.renew(),
});
