import { randomInt } from 'node:crypto';

import type { Rng } from '@comicle/shared';

function assertRange(maxExclusive: number): void {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`maxExclusive inválido: ${String(maxExclusive)}`);
  }
}

/** CSPRNG-backed Rng (R6, R23); used in production. */
export const cryptoRng: Rng = {
  nextInt(maxExclusive) {
    assertRange(maxExclusive);
    return randomInt(maxExclusive);
  },
};

const UINT32_RANGE = 2 ** 32;

/** Deterministic Rng (mulberry32) for tests; the same seed always yields the same sequence. */
export class SeededRng implements Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextInt(maxExclusive: number): number {
    assertRange(maxExclusive);
    return Math.floor((this.nextUint32() / UINT32_RANGE) * maxExclusive);
  }

  private nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
}
