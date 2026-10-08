// Bodies of the HTTP API (docs/protocolo-realtime.md §1).

import { z } from 'zod';

import type { ErrorBody } from '../domain/ack';
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

/** Body of every HTTP error, with the same codes as the realtime acks. */
export const errorResponseSchema = z.object({
  error: z.object({ code: z.enum(ErrorCode), message: z.string() }),
}) satisfies z.ZodType<{ error: ErrorBody }>;
