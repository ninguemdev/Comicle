import { activeOptions, isValidAvatar, randomAvatar } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { cryptoRng, SeededRng } from './random';

function sample(next: (max: number) => number, max: number, count: number): number[] {
  return Array.from({ length: count }, () => next(max));
}

describe('SeededRng', () => {
  it('a mesma semente produz a mesma sequência', () => {
    const a = new SeededRng(7);
    const b = new SeededRng(7);

    expect(sample((max) => a.nextInt(max), 100, 50)).toEqual(
      sample((max) => b.nextInt(max), 100, 50),
    );
  });

  it('sementes diferentes produzem sequências diferentes', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);

    expect(sample((max) => a.nextInt(max), 1000, 10)).not.toEqual(
      sample((max) => b.nextInt(max), 1000, 10),
    );
  });

  it('fica em [0, max) e cobre todos os valores', () => {
    const rng = new SeededRng(3);
    const values = sample((max) => rng.nextInt(max), 6, 600);

    expect(Math.min(...values)).toBe(0);
    expect(Math.max(...values)).toBe(5);
    expect(new Set(values).size).toBe(6);
  });
});

describe.each([
  ['cryptoRng', () => cryptoRng],
  ['SeededRng', () => new SeededRng(1)],
])('%s', (_name, create) => {
  it('recusa máximo zero, negativo ou fracionário', () => {
    const rng = create();
    for (const max of [0, -1, 1.5, Number.NaN]) {
      expect(() => rng.nextInt(max), String(max)).toThrow(RangeError);
    }
  });

  it('com máximo 1 sempre devolve 0', () => {
    const rng = create();
    expect(sample((max) => rng.nextInt(max), 1, 20)).toEqual(Array<number>(20).fill(0));
  });
});

describe('randomAvatar com SeededRng', () => {
  it('R4: é determinístico e sempre válido', () => {
    for (let seed = 0; seed < 200; seed++) {
      const avatar = randomAvatar(new SeededRng(seed));

      expect(isValidAvatar(avatar)).toBe(true);
      expect(randomAvatar(new SeededRng(seed))).toEqual(avatar);
    }
  });

  it('R4: sorteia todas as opções ativas, e "nenhum" nas opcionais', () => {
    const rng = new SeededRng(42);
    const seen = new Set<string | null>();
    for (let draw = 0; draw < 500; draw++) {
      seen.add(randomAvatar(rng).hat);
    }

    expect(seen).toEqual(new Set([null, ...activeOptions('hat').map((option) => option.id)]));
  });
});
