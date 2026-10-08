import type { Clock } from '../../platform/clock';
import type { RoomBroadcaster } from '../rooms/room-broadcaster';
import { socketIdOf, type Room } from '../rooms/room';
import { buildPlayerView } from './build-player-view';

export type PublishRoom = (room: Room) => void;

/** Sends each connected member their own view (D6: full projection after every change). */
export function createRoomPublisher(clock: Clock, broadcaster: RoomBroadcaster): PublishRoom {
  return (room) => {
    const now = clock.now();
    for (const member of room.members.values()) {
      const socketId = socketIdOf(member);
      if (socketId !== null) {
        broadcaster.sendView(socketId, buildPlayerView(room, member.playerId, now));
      }
    }
  };
}
