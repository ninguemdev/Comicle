import type { PlayerView } from '@comicle/shared';
import { create } from 'zustand';

import { env } from '../config/env';
import {
  createSocketClient,
  type ConnectionStatus,
  type SocketClient,
  type SocketClientOptions,
} from '../lib/socket-client';
import { startTimeSync, type TimeSample } from '../lib/time-sync';
import { useSessionStore } from './session-store';

interface RoomState {
  /** Last `room:view`: the only source of game state on the client (arquitetura §5). */
  view: PlayerView | null;
  connection: ConnectionStatus;
  /** Server clock minus local clock (protocolo §6). */
  clockOffsetMs: number;
  actions: {
    /**
     * Opens the socket once per page. Later calls only matter after the connection gave up
     * (`offline`): they retry with the given token.
     */
    connect(token: string): void;
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
          client.connect();
        },
      },
    };
  });
}

export const useRoomStore = createRoomStore({
  createSocketClient,
  renewSession: () => useSessionStore.getState().actions.renew(),
});
