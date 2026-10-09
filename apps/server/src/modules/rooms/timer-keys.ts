import type { Room } from './room';

/** One timer per key (arquitetura §4, Tempo); every key of a room starts with its ID. */
export const timerKeys = {
  hostTransfer: (room: Room) => `room:${room.id}:host-transfer`,
  removal: (room: Room, playerId: string) => `room:${room.id}:remove:${playerId}`,
  empty: (room: Room) => `room:${room.id}:empty`,
  maxAge: (room: Room) => `room:${room.id}:max-age`,
  /** Deadline of the current match phase. */
  phase: (room: Room) => `room:${room.id}:phase`,
};
