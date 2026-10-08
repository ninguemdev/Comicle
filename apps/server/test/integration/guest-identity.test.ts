import { GUEST_SESSION_TTL_MS } from '@comicle/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config/env';
import {
  connectClient,
  connectGuest,
  startTestServer,
  type TestClient,
  type TestServer,
  type TestServerOverrides,
} from '../support/test-server';

interface SessionBody {
  token: string;
  expiresAt: number;
}

describe('identidade de convidado', () => {
  let server: TestServer | undefined;
  const clients: TestClient[] = [];

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.disconnect());
    await server?.close();
  });

  async function start(overrides: TestServerOverrides = {}) {
    server = await startTestServer(overrides);
    return server;
  }

  async function createSession(app: TestServer): Promise<SessionBody> {
    const response = await app.http.inject({ method: 'POST', url: '/api/guest-sessions' });
    expect(response.statusCode).toBe(201);
    return response.json<SessionBody>();
  }

  function me(app: TestServer, authorization?: string) {
    return app.http.inject({
      method: 'GET',
      url: '/api/guest-sessions/me',
      headers: authorization === undefined ? {} : { authorization },
    });
  }

  describe('HTTP', () => {
    it('R3: criar → /me com o token → 200 e mesmo guestId', async () => {
      const app = await start();
      const { token, expiresAt } = await createSession(app);

      const first = await me(app, `Bearer ${token}`);
      const second = await me(app, `bearer ${token}`);

      expect(first.statusCode).toBe(200);
      expect(first.json<{ guestId: string }>().guestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(second.json()).toEqual(first.json());
      expect(expiresAt).toBe(app.clock.now() + GUEST_SESSION_TTL_MS);
    });

    it('R3: sem token, com token inválido ou mal formatado → 401 UNAUTHORIZED', async () => {
      const app = await start();
      const { token } = await createSession(app);

      for (const authorization of [undefined, 'Bearer nao-existe', token, `Basic ${token}`]) {
        const response = await me(app, authorization);
        expect(response.statusCode, String(authorization)).toBe(401);
        expect(response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
      }
    });

    it('R3: após GUEST_SESSION_TTL_MS sem uso → 401; uso no meio renova o prazo', async () => {
      const app = await start();
      const renewed = await createSession(app);
      const idle = await createSession(app);

      app.clock.advance(GUEST_SESSION_TTL_MS / 2);
      expect((await me(app, `Bearer ${renewed.token}`)).statusCode).toBe(200);
      app.clock.advance(GUEST_SESSION_TTL_MS / 2);

      expect((await me(app, `Bearer ${idle.token}`)).statusCode).toBe(401);
      expect((await me(app, `Bearer ${renewed.token}`)).statusCode).toBe(200);
    });

    it('criação de sessão tem rate limit de 10 por minuto por IP', async () => {
      const app = await start();
      for (let i = 0; i < 10; i++) {
        await createSession(app);
      }

      const response = await app.http.inject({ method: 'POST', url: '/api/guest-sessions' });

      expect(response.statusCode).toBe(429);
      expect(response.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    });

    it('logs: o token nunca aparece em claro', async () => {
      const lines: string[] = [];
      const app = await start({
        config: loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'trace' }),
        logDestination: { write: (line) => lines.push(line) },
      });
      const { token } = await createSession(app);

      await me(app, `Bearer ${token}`);
      await me(app, 'Bearer token-invalido-que-tambem-nao-pode-vazar');
      app.http.log.info({ authorization: `Bearer ${token}`, token }, 'objeto com segredos');

      expect(lines.length).toBeGreaterThan(0);
      const output = lines.join('\n');
      expect(output).not.toContain(token);
      expect(output).not.toContain('token-invalido-que-tambem-nao-pode-vazar');
      expect(output).toContain('[Redacted]');
    });
  });

  describe('Socket.IO', () => {
    async function expectRefused(app: TestServer, token?: string): Promise<void> {
      await expect(connectClient(app.url, token)).rejects.toThrow('UNAUTHORIZED');
    }

    it('socket sem token é recusado com UNAUTHORIZED', async () => {
      const app = await start();

      await expectRefused(app);
    });

    it('socket com token inválido ou expirado é recusado', async () => {
      const app = await start();
      const { token } = app.guestSessions.create();
      await expectRefused(app, 'token-que-nao-existe');

      app.clock.advance(GUEST_SESSION_TTL_MS);

      await expectRefused(app, token);
    });

    it('socket com token válido conecta e tem o guestId da sessão', async () => {
      const app = await start();
      const { client, guestId } = await connectGuest(app);
      clients.push(client);

      const [socket] = await app.io.fetchSockets();

      expect(socket?.data.guestId).toBe(guestId);
    });
  });
});
