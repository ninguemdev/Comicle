import type { ClientToServerEvents, ServerToClientEvents } from '@comicle/shared';
import type { Server, Socket } from 'socket.io';

/** Per-connection data; filled by the auth middleware from T05 on. */
export type SocketData = Record<string, never>;

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
