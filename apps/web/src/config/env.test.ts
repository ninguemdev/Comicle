import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

describe('parseEnv', () => {
  it('usa a mesma origem e a raiz quando nada é configurado', () => {
    expect(parseEnv({})).toEqual({ serverUrl: '', routerBasename: '/' });
  });

  it('remove a barra final da URL do servidor e do caminho base', () => {
    const env = parseEnv({
      VITE_SERVER_URL: 'https://jogos.example.com/',
      VITE_BASE_PATH: '/comicle/',
    });

    expect(env).toEqual({ serverUrl: 'https://jogos.example.com', routerBasename: '/comicle' });
  });

  it('recusa URL de servidor inválida e caminho base relativo', () => {
    expect(() => parseEnv({ VITE_SERVER_URL: 'localhost:3000' })).toThrow();
    expect(() => parseEnv({ VITE_BASE_PATH: 'comicle/' })).toThrow();
  });
});
