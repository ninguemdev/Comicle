import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';

import type { GuestSessionStore } from './session-store';

const HTTP_CREATED = 201;

/** docs/arquitetura.md §7: 10 new sessions per minute per IP. */
const CREATE_SESSION_RATE_LIMIT = { max: 10, timeWindow: 60_000 };

export function registerGuestIdentityRoutes(
  http: FastifyInstance,
  sessions: GuestSessionStore,
  requireGuest: preHandlerAsyncHookHandler,
): void {
  http.post(
    '/api/guest-sessions',
    { config: { rateLimit: CREATE_SESSION_RATE_LIMIT } },
    (_request, reply) => {
      const { token, expiresAt } = sessions.create();
      return reply.status(HTTP_CREATED).send({ token, expiresAt });
    },
  );

  http.get('/api/guest-sessions/me', { preHandler: requireGuest }, (request) => ({
    guestId: request.guestId,
  }));
}
