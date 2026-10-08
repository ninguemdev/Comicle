import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { DomainError } from '../errors';
import { registerErrorHandler } from './error-handler';

describe('registerErrorHandler', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  async function appThrowing(error: unknown): Promise<FastifyInstance> {
    app = Fastify({ logger: false });
    registerErrorHandler(app);
    app.get('/boom', () => {
      throw error;
    });
    app.post('/echo', (request) => request.body);
    await app.ready();
    return app;
  }

  it('DomainError vira { error: { code, message } } com o status do código', async () => {
    const instance = await appThrowing(new DomainError('NOT_HOST', 'Só o anfitrião.'));

    const response = await instance.inject({ method: 'GET', url: '/boom' });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: 'NOT_HOST', message: 'Só o anfitrião.' } });
  });

  it('erro desconhecido vira INTERNAL 500 sem detalhes internos', async () => {
    const instance = await appThrowing(new Error('senha do banco: hunter2'));

    const response = await instance.inject({ method: 'GET', url: '/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL', message: 'Erro interno. Tente novamente.' },
    });
    expect(response.body).not.toContain('hunter2');
  });

  it('JSON malformado vira INVALID_PAYLOAD 400', async () => {
    const instance = await appThrowing(new Error('não usado'));

    const response = await instance.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"quebrado":',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'INVALID_PAYLOAD' } });
  });
});
