import type { ClientToServerEvents, ServerToClientEvents } from '@comicle/shared';
import type { Server, Socket } from 'socket.io';

/** Per-connection data, set by the auth middleware before `connection`. */
export interface SocketData {
  guestId: string;
}

type NoInterServerEvents = Record<string, never>;

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  NoInterServerEvents,
  SocketData
>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  NoInterServerEvents,
  SocketData
>;
