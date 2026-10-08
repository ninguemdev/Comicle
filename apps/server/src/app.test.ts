import { afterEach, describe, expect, it } from 'vitest';

import { createTestDeps } from '../test/support/test-server';
import { buildApp, type App } from './app';

describe('buildApp', () => {
  let app: App | undefined;

  afterEach(async () => {
    await app?.http.close();
  });

  it('GET /healthz responde 200', async () => {
    app = await buildApp(createTestDeps());

    const response = await app.http.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('aplica os cabeçalhos do helmet e o CORS configurado', async () => {
    app = await buildApp(createTestDeps());

    const response = await app.http.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'http://localhost:5173' },
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
