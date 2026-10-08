import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './http-client';
import { bootSession } from './session';
import { STORAGE_KEYS, storage } from './storage';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const UNAUTHORIZED = { error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } };

/** Fake server: `/me` accepts only `validToken`; POST always issues `newToken`. */
function fakeServer(validToken: string | null, newToken = 'novo') {
  return vi.fn<typeof fetch>((input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith('/api/guest-sessions/me')) {
      const headers = new Headers(init?.headers);
      const authorized =
        validToken !== null && headers.get('Authorization') === `Bearer ${validToken}`;
      return Promise.resolve(
        authorized ? jsonResponse(200, { guestId: 'g1' }) : jsonResponse(401, UNAUTHORIZED),
      );
    }
    if (url.endsWith('/api/guest-sessions') && init?.method === 'POST') {
      return Promise.resolve(jsonResponse(201, { token: newToken, expiresAt: 1 }));
    }
    return Promise.resolve(jsonResponse(404, { error: { code: 'INTERNAL', message: '?' } }));
  });
}

function savedToken(): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEYS.session);
  return raw === null ? null : JSON.parse(raw);
}

describe('bootSession', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('R3: token salvo válido é reaproveitado sem criar sessão', async () => {
    storage.write(STORAGE_KEYS.session, { token: 'salvo' });
    const fetch = fakeServer('salvo');

    const result = await bootSession({ http: createHttpClient({ baseUrl: '', fetch }), storage });

    expect(result).toEqual({ ok: true, data: 'salvo' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('R3: 401 cria sessão nova e guarda em comicle.session', async () => {
    storage.write(STORAGE_KEYS.session, { token: 'expirado' });
    const fetch = fakeServer(null, 'novo');

    const result = await bootSession({ http: createHttpClient({ baseUrl: '', fetch }), storage });

    expect(result).toEqual({ ok: true, data: 'novo' });
    expect(savedToken()).toEqual({ token: 'novo' });
  });

  it('R3: primeira visita cria sessão sem consultar /me', async () => {
    const fetch = fakeServer(null, 'primeiro');

    const result = await bootSession({ http: createHttpClient({ baseUrl: '', fetch }), storage });

    expect(result).toEqual({ ok: true, data: 'primeiro' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(savedToken()).toEqual({ token: 'primeiro' });
  });

  it('servidor fora do ar não descarta o token salvo', async () => {
    storage.write(STORAGE_KEYS.session, { token: 'salvo' });
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    );

    const result = await bootSession({ http: createHttpClient({ baseUrl: '', fetch }), storage });

    expect(result.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(savedToken()).toEqual({ token: 'salvo' });
  });
});
