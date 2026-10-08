import { randomUUID } from 'node:crypto';

/** Opaque unique ID for players, matches, stories and panels. */
export function newId(): string {
  return randomUUID();
}
