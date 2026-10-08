import { describe, expect, it } from 'vitest';

import { errorResponseSchema, guestSessionCreatedSchema } from './http';

describe('schemas HTTP', () => {
  it('aceita a resposta de criação de sessão', () => {
    const body = { token: 'abc', expiresAt: 1_700_000_000_000 };

    expect(guestSessionCreatedSchema.parse(body)).toEqual(body);
  });

  it('aceita o corpo de erro com um ErrorCode conhecido', () => {
    const body = { error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } };

    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('recusa o corpo de erro com código desconhecido', () => {
    const body = { error: { code: 'TEAPOT', message: 'x' } };

    expect(errorResponseSchema.safeParse(body).success).toBe(false);
  });
});
