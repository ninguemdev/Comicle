import { fail, ok, type Ack } from '@comicle/shared';
import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '../lib/http-client';
import { createSafeStorage } from '../lib/storage';
import { createSessionStore } from './session-store';

/** In-memory storage, so each test starts on a first visit. */
function memoryStorage() {
  const items = new Map<string, string>();
  return createSafeStorage(() => ({
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  }));
}

/** Answers `POST /api/guest-sessions` with each given result, in order. */
function sessionServer(...results: Ack<{ token: string; expiresAt: number }>[]) {
  const queue = [...results];
  const http = vi.fn(() => Promise.resolve(queue.shift() ?? fail('INTERNAL', '')));
  // One response shape serves every request in these tests.
  return http as unknown as HttpClient & typeof http;
}

describe('session-store', () => {
  it('R3: chamadas simultâneas de boot compartilham uma única requisição', async () => {
    const http = sessionServer(ok({ token: 'tok', expiresAt: 1 }));
    const store = createSessionStore({ http, storage: memoryStorage() });

    const [first, second] = await Promise.all([
      store.getState().actions.boot(),
      store.getState().actions.boot(),
    ]);

    expect([first, second]).toEqual(['tok', 'tok']);
    expect(http).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({ status: 'ready', token: 'tok' });
  });

  it('com a sessão pronta, boot devolve o token sem nova requisição', async () => {
    const http = sessionServer(ok({ token: 'tok', expiresAt: 1 }));
    const store = createSessionStore({ http, storage: memoryStorage() });
    await store.getState().actions.boot();

    await expect(store.getState().actions.boot()).resolves.toBe('tok');
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('falha do servidor marca erro, e tentar de novo recupera', async () => {
    const http = sessionServer(fail('INTERNAL', 'fora do ar'), ok({ token: 'tok', expiresAt: 1 }));
    const store = createSessionStore({ http, storage: memoryStorage() });

    await expect(store.getState().actions.boot()).resolves.toBeNull();
    expect(store.getState().status).toBe('error');

    await expect(store.getState().actions.boot()).resolves.toBe('tok');
    expect(store.getState().status).toBe('ready');
  });

  it('R3: renew troca o token por uma sessão nova', async () => {
    const http = sessionServer(
      ok({ token: 'velho', expiresAt: 1 }),
      ok({ token: 'novo', expiresAt: 2 }),
    );
    const store = createSessionStore({ http, storage: memoryStorage() });
    await store.getState().actions.boot();

    await expect(store.getState().actions.renew()).resolves.toBe('novo');
    expect(store.getState().token).toBe('novo');
  });
});
