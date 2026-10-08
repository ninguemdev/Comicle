import type { PlayerView, RoomRemovedReason } from '@comicle/shared';

/** What the rooms module sends to sockets (protocolo §4); keeps services free of Socket.IO. */
export interface RoomBroadcaster {
  sendView(socketId: string, view: PlayerView): void;
  sendRemoved(socketId: string, reason: RoomRemovedReason): void;
  /** R5: tells the old connection another one took over, then closes it. */
  replaceSession(socketId: string): void;
}
