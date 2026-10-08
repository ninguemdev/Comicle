import { describe, expect, it } from 'vitest';

import { safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it('mantém caminhos do próprio jogo', () => {
    expect(safeNextPath('/sala/K7PQ2M')).toBe('/sala/K7PQ2M');
    expect(safeNextPath('/')).toBe('/');
  });

  it('troca ausente, relativo ou externo pelo início', () => {
    for (const raw of [null, '', 'sala/K7PQ2M', '//exemplo.com', '/\\exemplo.com', 'https://x.y']) {
      expect(safeNextPath(raw), String(raw)).toBe('/');
    }
  });
});
