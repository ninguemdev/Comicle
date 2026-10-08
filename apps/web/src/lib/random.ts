import type { Rng } from '@comicle/shared';

const UINT32_RANGE = 2 ** 32;

/**
 * Rng backed by `crypto.getRandomValues` (D18). Rejection sampling keeps every value equally
 * likely: plain `% max` would favor the low values whenever `max` does not divide 2^32.
 */
export const cryptoRng: Rng = {
  nextInt(maxExclusive) {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
      throw new RangeError(`maxExclusive inválido: ${String(maxExclusive)}`);
    }
    const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
    const buffer = new Uint32Array(1);
    for (;;) {
      crypto.getRandomValues(buffer);
      const value = buffer[0] ?? 0;
      if (value < limit) {
        return value % maxExclusive;
      }
    }
  },
};
