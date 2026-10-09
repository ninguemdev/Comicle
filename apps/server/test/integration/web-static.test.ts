import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp, type App } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { createTestDeps } from '../support/test-server';

// T22: the server serves the web build under PUBLIC_BASE_PATH (arquitetura §9).

const BASE_PATH = '/jogos/quadrinhos/';
const INDEX_HTML = '<!doctype html><title>Comicle</title>';
const BUNDLE = 'console.log("comicle")';

let dist: string;

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), 'comicle-web-'));
  mkdirSync(join(dist, 'assets'));
  mkdirSync(join(dist, 'avatars', 'head'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), INDEX_HTML);
  writeFileSync(join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(dist, 'assets', 'index-AbC123.js'), BUNDLE);
  writeFileSync(join(dist, 'avatars', 'head', 'head-round.png'), 'png');
});

afterAll(() => {
  rmSync(dist, { recursive: true, force: true });
});

async function appServing(basePath: string): Promise<App> {
  return buildApp(
    createTestDeps({
      config: loadConfig({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        SERVE_WEB_DIST: dist,
        PUBLIC_BASE_PATH: basePath,
      }),
    }),
  );
}

describe(`web servido em ${BASE_PATH}`, () => {
  let app: App;

  beforeAll(async () => {
    app = await appServing(BASE_PATH);
  });

  afterAll(async () => {
    await app.http.close();
  });

  it('a raiz do base path entrega o index.html, revalidado a cada visita', async () => {
    const response = await app.http.inject({ method: 'GET', url: BASE_PATH });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.body).toBe(INDEX_HTML);
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('sem a barra final, redireciona para o base path', async () => {
    const response = await app.http.inject({ method: 'GET', url: '/jogos/quadrinhos' });

    expect(response.statusCode).toBeGreaterThanOrEqual(300);
    expect(response.statusCode).toBeLessThan(400);
    expect(response.headers.location).toBe(BASE_PATH);
  });

  it('recarregar numa rota do cliente entrega o index.html', async () => {
    for (const url of [`${BASE_PATH}sala/K7PQ2M`, `${BASE_PATH}perfil?next=%2Fsala%2FK7PQ2M`]) {
      const response = await app.http.inject({ method: 'GET', url });

      expect(response.statusCode, url).toBe(200);
      expect(response.body, url).toBe(INDEX_HTML);
      expect(response.headers['cache-control'], url).toBe('no-cache');
    }
  });

  it('assets com hash ficam em cache por um ano; os demais arquivos são revalidados', async () => {
    const bundle = await app.http.inject({
      method: 'GET',
      url: `${BASE_PATH}assets/index-AbC123.js`,
    });
    const avatar = await app.http.inject({
      method: 'GET',
      url: `${BASE_PATH}avatars/head/head-round.png`,
    });

    expect(bundle.statusCode).toBe(200);
    expect(bundle.body).toBe(BUNDLE);
    expect(bundle.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(avatar.statusCode).toBe(200);
    expect(avatar.headers['cache-control']).toBe('no-cache');
  });

  it('arquivo inexistente é 404, não o index.html', async () => {
    const response = await app.http.inject({ method: 'GET', url: `${BASE_PATH}assets/nada.js` });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toBe(INDEX_HTML);
  });

  it('fora do base path nada é servido, e a API e o /healthz continuam na raiz', async () => {
    const outside = await app.http.inject({ method: 'GET', url: '/sala/K7PQ2M' });
    const health = await app.http.inject({ method: 'GET', url: '/healthz' });
    const room = await app.http.inject({ method: 'GET', url: '/api/rooms/K7PQ2M' });

    expect(outside.statusCode).toBe(404);
    expect(health.statusCode).toBe(200);
    expect(room.statusCode).toBe(404);
    expect(room.json()).toMatchObject({ error: { code: 'ROOM_NOT_FOUND' } });
  });

  it('as páginas levam os cabeçalhos de segurança (CSP)', async () => {
    const response = await app.http.inject({ method: 'GET', url: `${BASE_PATH}sala/K7PQ2M` });

    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });
});

describe('web servido na raiz', () => {
  let app: App;

  beforeAll(async () => {
    app = await appServing('/');
  });

  afterAll(async () => {
    await app.http.close();
  });

  it('entrega o index.html em / e nas rotas do cliente', async () => {
    for (const url of ['/', '/sala/K7PQ2M', '/perfil']) {
      const response = await app.http.inject({ method: 'GET', url });

      expect(response.statusCode, url).toBe(200);
      expect(response.body, url).toBe(INDEX_HTML);
    }
  });

  it('caminhos da API que não existem continuam 404, sem cair no index.html', async () => {
    for (const url of ['/api/nada', '/api/rooms', '/socket.io/nada', '/healthz/x']) {
      const response = await app.http.inject({ method: 'GET', url });

      expect(response.statusCode, url).toBe(404);
      expect(response.body, url).not.toBe(INDEX_HTML);
    }
  });
});

describe('SERVE_WEB_DIST inválido', () => {
  it('sem index.html, o servidor não sobe', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'comicle-empty-'));
    try {
      await expect(
        buildApp(
          createTestDeps({
            config: loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', SERVE_WEB_DIST: empty }),
          }),
        ),
      ).rejects.toThrow(/index\.html/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
