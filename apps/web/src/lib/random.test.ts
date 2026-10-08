import { describe, expect, it } from 'vitest';

import { cryptoRng } from './random';

describe('cryptoRng', () => {
  it('fica em [0, max) e cobre todos os valores', () => {
    const values = Array.from({ length: 600 }, () => cryptoRng.nextInt(6));

    expect(Math.min(...values)).toBe(0);
    expect(Math.max(...values)).toBe(5);
    expect(new Set(values).size).toBe(6);
  });

  it('recusa máximo zero, negativo, fracionário ou acima de 2^32', () => {
    for (const max of [0, -1, 1.5, Number.NaN, 2 ** 32 + 1]) {
      expect(() => cryptoRng.nextInt(max), String(max)).toThrow(RangeError);
    }
  });
});
