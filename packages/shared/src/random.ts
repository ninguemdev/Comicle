/**
 * Injected source of randomness, so pure code never calls `Math.random()`.
 * The server implements it with `crypto` (and a seeded version for tests).
 */
export interface Rng {
  /** Uniform integer in `[0, maxExclusive)`. */
  nextInt(maxExclusive: number): number;
}
