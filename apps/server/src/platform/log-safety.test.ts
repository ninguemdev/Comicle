import { describe, expect, it } from 'vitest';

import { serializeError } from './log-safety';

describe('serializeError', () => {
  it('mantém tipo, código e pilha; tira os parâmetros da query e o detail do pg', () => {
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      detail: 'Key (text)=(Um gato astronauta) already exists.',
    });
    const queryError = new Error(
      'Failed query: insert into "themes" ("text") values ($1)\nparams: Um gato astronauta,iVBORw0KGgo',
      { cause: pgError },
    );

    const serialized = serializeError(queryError);
    const json = JSON.stringify(serialized);

    expect(serialized).toMatchObject({
      type: 'Error',
      message: 'Failed query: insert into "themes" ("text") values ($1)',
      cause: { message: 'duplicate key value violates unique constraint', code: '23505' },
    });
    expect(serialized.stack).toContain('log-safety.test.ts');
    expect(json).not.toContain('Um gato astronauta');
    expect(json).not.toContain('iVBORw0KGgo');
    expect(json).not.toContain('detail');
  });

  it('params na mesma linha também saem; mensagens longas são cortadas', () => {
    expect(serializeError(new Error('falhou params: segredo')).message).toBe('falhou');
    expect(serializeError(new Error('x'.repeat(500))).message).toHaveLength(200);
  });

  it('valores que não são Error viram só o tipo', () => {
    expect(serializeError('Um gato astronauta')).toEqual({ type: 'string', message: '', stack: '' });
  });
});
