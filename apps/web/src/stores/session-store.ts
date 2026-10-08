import type { Ack } from '@comicle/shared';
import { create } from 'zustand';

import { env } from '../config/env';
import { createHttpClient } from '../lib/http-client';
import { bootSession, createSession, type SessionDeps } from '../lib/session';
import { storage } from '../lib/storage';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

type SessionRequest = (deps: SessionDeps) => Promise<Ack<string>>;

interface SessionState {
  status: SessionStatus;
  token: string | null;
  actions: {
    /** Boot (R3). Concurrent calls share one request, so StrictMode's double effect is harmless. */
    boot(): Promise<string | null>;
    /** The server refused the current token: replaces it silently (R3). */
    renew(): Promise<string | null>;
  };
}

export function createSessionStore(deps: SessionDeps) {
  let pending: Promise<string | null> | null = null;

  return create<SessionState>()((set, get) => {
    async function run(request: SessionRequest): Promise<string | null> {
      set({ status: 'loading' });
      const result = await request(deps);
      if (!result.ok) {
        set({ status: 'error' });
        return null;
      }
      set({ status: 'ready', token: result.data });
      return result.data;
    }

    function runOnce(request: SessionRequest): Promise<string | null> {
      pending ??= run(request).finally(() => {
        pending = null;
      });
      return pending;
    }

    return {
      status: 'idle',
      token: null,
      actions: {
        boot() {
          const { status, token } = get();
          return status === 'ready' ? Promise.resolve(token) : runOnce(bootSession);
        },
        renew() {
          return runOnce(createSession);
        },
      },
    };
  });
}

export const useSessionStore = createSessionStore({
  http: createHttpClient({ baseUrl: env.serverUrl }),
  storage,
});
