import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createHttpClient } from './http-client';

const schema = z.object({ guestId: z.string() });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('http-client', () => {
  it('monta a URL com a base e envia o token no Authorization', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(jsonResponse(200, { guestId: 'g1' })),
    );
    const http = createHttpClient({ baseUrl: 'https://api.example.com', fetch });

    const result = await http({ path: '/api/guest-sessions/me', token: 'tok', schema });

    expect(result).toEqual({ ok: true, data: { guestId: 'g1' } });
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/guest-sessions/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('converte o corpo { error: { code } } em falha com o mesmo código', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sessão.' } })),
    );
    const http = createHttpClient({ baseUrl: '', fetch });

    const result = await http({ path: '/api/guest-sessions/me', token: 'velho', schema });

    expect(result).toEqual({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Sessão.' } });
  });

  it('trata falha de rede, corpo de erro desconhecido e sucesso fora do schema como INTERNAL', async () => {
    const responses = [
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(new Response('<html>502</html>', { status: 502 })),
      () => Promise.resolve(jsonResponse(200, { inesperado: true })),
    ];
    for (const respond of responses) {
      const http = createHttpClient({ baseUrl: '', fetch: respond });

      const result = await http({ path: '/api/x', schema });

      expect(result.ok ? null : result.error.code).toBe('INTERNAL');
    }
  });
});
