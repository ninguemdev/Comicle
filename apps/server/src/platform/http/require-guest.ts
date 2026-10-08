import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { DomainError } from '../errors';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireGuest`; empty on routes that do not require a session. */
    guestId: string;
  }
}

/** Resolves a session token to its guestId (renewing it), or null when invalid. */
export type AuthenticateToken = (token: string) => string | null;

const BEARER = /^Bearer\s+(\S+)$/i;

function bearerToken(request: FastifyRequest): string | null {
  const match = BEARER.exec(request.headers.authorization ?? '');
  return match?.[1] ?? null;
}

/** preHandler for routes that need a guest session (`Authorization: Bearer <token>`). */
export function createRequireGuest(authenticate: AuthenticateToken): preHandlerAsyncHookHandler {
  return (request) => {
    const token = bearerToken(request);
    const guestId = token === null ? null : authenticate(token);
    if (guestId === null) {
      return Promise.reject(new DomainError('UNAUTHORIZED', 'Sessão inválida ou expirada.'));
    }
    request.guestId = guestId;
    return Promise.resolve();
  };
}
