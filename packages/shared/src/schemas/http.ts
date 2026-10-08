// Bodies of the HTTP API (docs/protocolo-realtime.md §1).

import { z } from 'zod';

import type { ErrorBody } from '../domain/ack';
import type { RoomStatus } from '../domain/player-view';
import { ErrorCode } from '../errors';

/** `POST /api/guest-sessions` → 201. `expiresAt` is ms since epoch on the server clock (R3). */
export const guestSessionCreatedSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.number(),
});

export type GuestSessionCreated = z.infer<typeof guestSessionCreatedSchema>;

/** `GET /api/guest-sessions/me` → 200. */
export const guestSessionMeSchema = z.object({ guestId: z.string().min(1) });

export type GuestSessionMe = z.infer<typeof guestSessionMeSchema>;

/** `GET /api/rooms/:code` → 200: pre-check before joining. `joinable` means "not full" (R9). */
export const roomLookupSchema = z.object({
  code: z.string(),
  status: z.enum(['lobby', 'in_match']) satisfies z.ZodType<RoomStatus>,
  memberCount: z.int().nonnegative(),
  joinable: z.boolean(),
});

export type RoomLookup = z.infer<typeof roomLookupSchema>;

/** Body of every HTTP error, with the same codes as the realtime acks. */
export const errorResponseSchema = z.object({
  error: z.object({ code: z.enum(ErrorCode), message: z.string() }),
}) satisfies z.ZodType<{ error: ErrorBody }>;
