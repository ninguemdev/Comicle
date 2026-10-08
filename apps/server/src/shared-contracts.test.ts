import { describe, expect, it } from 'vitest';

import { clientEventSchemas, fail } from '@comicle/shared';

describe('@comicle/shared no servidor', () => {
  it('importa schemas e helpers do pacote compartilhado', () => {
    expect(fail('INTERNAL', 'Erro interno.')).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Erro interno.' },
    });
  });

  it('aceita o Buffer do Node como PNG nos eventos de quadro', () => {
    const payload = { roundIndex: 0, png: Buffer.from([0x89, 0x50, 0x4e, 0x47]) };

    expect(clientEventSchemas['panel:autosave'].safeParse(payload).success).toBe(true);
  });
});
