import {
  fail,
  type Ack,
  type ClientEventAckData,
  type ClientEventName,
  type ClientEventPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@comicle/shared';
import { io, type Socket } from 'socket.io-client';

import { strings } from '../strings/pt-BR';

/** How long an action waits for its ack before it is reported as failed. */
export const ACK_TIMEOUT_MS = 10_000;

/** Message of the `connect_error` raised by the server's auth middleware (protocolo §2). */
const UNAUTHORIZED_MESSAGE = 'UNAUTHORIZED';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketClientOptions {
  /** '' = same origin. */
  serverUrl: string;
  token: string;
  onStatusChange(status: ConnectionStatus): void;
  /** The server refused the token (R3): get a new session and call `reconnectWithToken`. */
  onUnauthorized(): void;
}

export interface SocketClient {
  connect(): void;
  disconnect(): void;
  reconnectWithToken(token: string): void;
  /** Always resolves: no answer within `ACK_TIMEOUT_MS` becomes `fail('INTERNAL', …)`. */
  emitWithAck<E extends ClientEventName>(
    event: E,
    payload: ClientEventPayload<E>,
  ): Promise<Ack<ClientEventAckData[E]>>;
  on<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): () => void;
}

export function createSocketClient(options: SocketClientOptions): SocketClient {
  const socketOptions = { autoConnect: false, auth: { token: options.token } };
  const socket: AppSocket =
    options.serverUrl === '' ? io(socketOptions) : io(options.serverUrl, socketOptions);
  // Socket.IO cannot resolve its conditional event types for a generic event name, so the
  // generic methods below go through this untyped view; their own signatures keep callers typed.
  const untypedSocket: Socket = socket;

  function statusWhenDown(): ConnectionStatus {
    // `active` is false after a manual disconnect or a server-side kick: no automatic retry.
    return socket.active ? 'reconnecting' : 'offline';
  }

  socket.on('connect', () => {
    options.onStatusChange('connected');
  });
  socket.on('disconnect', () => {
    options.onStatusChange(statusWhenDown());
  });
  socket.on('connect_error', (error) => {
    if (error.message === UNAUTHORIZED_MESSAGE) {
      options.onUnauthorized();
      return;
    }
    options.onStatusChange(statusWhenDown());
  });

  return {
    connect() {
      socket.connect();
    },
    disconnect() {
      socket.disconnect();
    },
    reconnectWithToken(token) {
      socket.auth = { token };
      socket.connect();
    },
    async emitWithAck(event, payload) {
      try {
        const response: unknown = await untypedSocket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck(event, payload);
        // The server answers every event with the Ack of ClientEventAckData (@comicle/shared).
        return response as Ack<ClientEventAckData[typeof event]>;
      } catch {
        return fail('INTERNAL', strings.connection.ackTimeout);
      }
    },
    on(event, listener) {
      const eventName: string = event;
      untypedSocket.on(eventName, listener);
      return () => {
        untypedSocket.off(eventName, listener);
      };
    },
  };
}
