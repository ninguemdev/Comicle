import { describe, expect, it } from 'vitest';

import {
  errorResponseSchema,
  guestSessionCreatedSchema,
  myDraftQuerySchema,
  roomLookupSchema,
} from './http';

describe('schemas HTTP', () => {
  it('aceita a resposta de criação de sessão', () => {
    const body = { token: 'abc', expiresAt: 1_700_000_000_000 };

    expect(guestSessionCreatedSchema.parse(body)).toEqual(body);
  });

  it('aceita a consulta de sala e recusa status desconhecido', () => {
    const body = { code: 'K7PQ2M', status: 'lobby', memberCount: 3, joinable: true };

    expect(roomLookupSchema.parse(body)).toEqual(body);
    expect(roomLookupSchema.safeParse({ ...body, status: 'closed' }).success).toBe(false);
  });

  it('aceita o corpo de erro com um ErrorCode conhecido', () => {
    const body = { error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } };

    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('recusa o corpo de erro com código desconhecido', () => {
    const body = { error: { code: 'TEAPOT', message: 'x' } };

    expect(errorResponseSchema.safeParse(body).success).toBe(false);
  });

  it('R48, R66: my-draft lê o quadro da query, 0 se ausente', () => {
    expect(myDraftQuerySchema.parse({})).toEqual({ panelIndex: 0 });
    expect(myDraftQuerySchema.parse({ panelIndex: '3' })).toEqual({ panelIndex: 3 });
    for (const panelIndex of ['-1', '6', '1.5', 'abc']) {
      expect(myDraftQuerySchema.safeParse({ panelIndex }).success, panelIndex).toBe(false);
    }
  });
});
