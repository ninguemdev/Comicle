import { describe, expect, it } from 'vitest';

import { buildApp } from './app';

describe('buildApp', () => {
  it('GET /healthz responde 200', async () => {
    const app = buildApp();

    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
