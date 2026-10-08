import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from './env';

describe('loadConfig', () => {
  it('usa os padrões de dev de docs/arquitetura.md §6', () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_URL: 'postgres://comicle:comicle@localhost:5432/comicle',
      CORS_ORIGINS: ['http://localhost:5173'],
      PUBLIC_BASE_PATH: '/',
      LOG_LEVEL: 'info',
      TRUST_PROXY: false,
      GAME_TIMING_PROFILE: 'default',
    });
  });

  it('converte porta, booleano, lista de origens e caminho vazio', () => {
    const config = loadConfig({
      PORT: '8080',
      TRUST_PROXY: 'true',
      CORS_ORIGINS: 'https://a.example, https://b.example ,',
      SERVE_WEB_DIST: '',
    });

    expect(config.PORT).toBe(8080);
    expect(config.TRUST_PROXY).toBe(true);
    expect(config.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
    expect(config.SERVE_WEB_DIST).toBeUndefined();
  });

  it('config inválida gera erro descritivo com cada variável', () => {
    const load = () =>
      loadConfig({ PORT: 'abc', TRUST_PROXY: 'sim', CORS_ORIGINS: 'não-é-url', LOG_LEVEL: 'x' });

    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/PORT/);
    expect(load).toThrow(/TRUST_PROXY/);
    expect(load).toThrow(/CORS_ORIGINS.*não-é-url/);
    expect(load).toThrow(/LOG_LEVEL/);
  });

  it('recusa GAME_TIMING_PROFILE=fast em produção', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', GAME_TIMING_PROFILE: 'fast' })).toThrow(
      /GAME_TIMING_PROFILE/,
    );
    expect(loadConfig({ NODE_ENV: 'test', GAME_TIMING_PROFILE: 'fast' }).GAME_TIMING_PROFILE).toBe(
      'fast',
    );
  });
});
