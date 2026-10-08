import { describe, expect, it } from 'vitest';

import { roomCodeSchema } from './room-code';

describe('roomCodeSchema', () => {
  it('R6: código é normalizado para maiúsculas e sem espaços', () => {
    expect(roomCodeSchema.parse(' k7pq2m ')).toBe('K7PQ2M');
    expect(roomCodeSchema.parse('k7p q2m')).toBe('K7PQ2M');
  });

  it('R6: caracteres fora do alfabeto são rejeitados', () => {
    for (const code of ['K7PQ0M', 'K7PQOM', 'K7PQ1M', 'K7PQIM', 'K7PQLM', 'K7PQ-M']) {
      expect(roomCodeSchema.safeParse(code).success, code).toBe(false);
    }
  });

  it('R6: comprimento diferente de 6 é rejeitado', () => {
    expect(roomCodeSchema.safeParse('K7PQ2').success).toBe(false);
    expect(roomCodeSchema.safeParse('K7PQ2MM').success).toBe(false);
  });
});
