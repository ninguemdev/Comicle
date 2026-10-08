import { guestSessionCreatedSchema, guestSessionMeSchema, ok, type Ack } from '@comicle/shared';
import { z } from 'zod';

import type { HttpClient } from './http-client';
import { STORAGE_KEYS, type SafeStorage } from './storage';

/** Shape of `comicle.session`. */
const storedSessionSchema = z.object({ token: z.string().min(1) });

export interface SessionDeps {
  http: HttpClient;
  storage: SafeStorage;
}

/** Asks the server for a new session and saves its token (R3). */
export async function createSession({ http, storage }: SessionDeps): Promise<Ack<string>> {
  const created = await http({
    method: 'POST',
    path: '/api/guest-sessions',
    schema: guestSessionCreatedSchema,
  });
  if (!created.ok) {
    return created;
  }
  // Without storage the session still works until the tab closes.
  storage.write(STORAGE_KEYS.session, { token: created.data.token });
  return ok(created.data.token);
}

/**
 * Boot (R3, arquitetura §5): reuses the saved token while the server accepts it and silently
 * replaces it when the server answers 401. Other failures leave the saved token untouched.
 */
export async function bootSession(deps: SessionDeps): Promise<Ack<string>> {
  const saved = deps.storage.read(STORAGE_KEYS.session, storedSessionSchema);
  if (saved !== null) {
    const me = await deps.http({
      path: '/api/guest-sessions/me',
      token: saved.token,
      schema: guestSessionMeSchema,
    });
    if (me.ok) {
      return ok(saved.token);
    }
    if (me.error.code !== 'UNAUTHORIZED') {
      return me;
    }
  }
  return createSession(deps);
}
