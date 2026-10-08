import { randomBytes, randomUUID } from 'node:crypto';

const SESSION_TOKEN_BYTES = 32;

/** Opaque unique ID for guests, players, matches, stories and panels. */
export function newId(): string {
  return randomUUID();
}

/** R3: 32 random bytes from the CSPRNG, base64url. */
export function newSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}
