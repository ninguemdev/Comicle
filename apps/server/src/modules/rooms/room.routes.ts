import { MAX_PLAYERS, roomCodeSchema, type RoomLookup } from '@comicle/shared';
import type { FastifyInstance } from 'fastify';

import { DomainError } from '../../platform/errors';
import type { RoomRegistry } from './room-registry';

/** docs/arquitetura.md §7: 30 lookups per minute per IP, against scanning for codes. */
const ROOM_LOOKUP_RATE_LIMIT = { max: 30, timeWindow: 60_000 };

export function registerRoomRoutes(http: FastifyInstance, registry: RoomRegistry): void {
  http.get<{ Params: { code: string } }>(
    '/api/rooms/:code',
    { config: { rateLimit: ROOM_LOOKUP_RATE_LIMIT } },
    (request) => {
      // A malformed code answers like a missing room: the client shows the same message.
      const parsed = roomCodeSchema.safeParse(request.params.code);
      const room = parsed.success ? registry.byCode(parsed.data) : undefined;
      if (!room || room.closed) {
        throw new DomainError('ROOM_NOT_FOUND', 'Sala não encontrada.');
      }
      return {
        code: room.code,
        status: room.status,
        memberCount: room.members.size,
        // Anonymous route: whether this guest is a member or banned is up to `room:join`.
        joinable: room.members.size < MAX_PLAYERS,
      } satisfies RoomLookup;
    },
  );
}
