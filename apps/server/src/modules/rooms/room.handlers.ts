import {
  defineHandler,
  type HandlerContext,
  type SocketHandler,
} from '../../platform/realtime/define-handler';
import type { AppSocketServer } from '../../platform/realtime/socket-types';
import type { RoomBroadcaster } from './room-broadcaster';
import type { RoomActor, RoomService } from './room.service';

function actorOf({ socket }: HandlerContext): RoomActor {
  return { socketId: socket.id, guestId: socket.data.guestId };
}

/** `room:*` and `player:updateProfile` (protocolo §3): validate, delegate, answer. */
export function roomHandlers(service: RoomService): SocketHandler[] {
  return [
    defineHandler('room:create', ({ profile }, context) =>
      service.create(actorOf(context), profile),
    ),
    defineHandler('room:join', ({ roomCode, profile }, context) =>
      service.join(actorOf(context), roomCode, profile),
    ),
    defineHandler('room:leave', (_payload, { socket }) => service.leave(socket.id)),
    defineHandler('room:kick', ({ playerId }, { socket }) => service.kick(socket.id, playerId)),
    defineHandler('room:updateSettings', ({ settings }, { socket }) =>
      service.updateSettings(socket.id, settings),
    ),
    defineHandler('player:updateProfile', ({ profile }, { socket }) =>
      service.updateProfile(socket.id, profile),
    ),
  ];
}

/** The Socket.IO server exists only after Fastify is ready, so it is read on each send. */
export function createSocketBroadcaster(server: () => AppSocketServer): RoomBroadcaster {
  return {
    sendView(socketId, view) {
      server().to(socketId).emit('room:view', view);
    },
    sendRemoved(socketId, reason) {
      server().to(socketId).emit('room:removed', { reason });
    },
    replaceSession(socketId) {
      const socket = server().sockets.sockets.get(socketId);
      socket?.emit('session:replaced', {});
      // Packets already queued are flushed before the connection closes.
      socket?.disconnect(true);
    },
  };
}
