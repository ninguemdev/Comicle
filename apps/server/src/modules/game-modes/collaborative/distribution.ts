import type { DistributionPlan } from '../game-mode';

function assertValidInput(seats: readonly string[], totalRounds: number): void {
  if (seats.length === 0 || new Set(seats).size !== seats.length) {
    throw new RangeError('Os assentos devem ser não vazios e únicos.');
  }
  if (!Number.isSafeInteger(totalRounds) || totalRounds < 1) {
    throw new RangeError(`totalRounds inválido: ${String(totalRounds)}`);
  }
}

/**
 * R31: in round `r`, story `s_i` goes to seat `(i + k) mod N`, with `k = 1 + (r mod C)`: the
 * rotation starts at the neighbour and goes around `C` seats. With the author included
 * (`C = N`), `N` rounds end with the author drawing the last panel of their own story (D8);
 * without (`C = N − 1`), `k` is never `N`, so the author never draws their own story (D45).
 * Inverting it, the player in seat `j` draws story `(j − k) mod N`.
 */
export function buildCollaborativePlan(
  seats: readonly string[],
  totalRounds: number,
  { authorDraws }: { authorDraws: boolean },
): DistributionPlan {
  assertValidInput(seats, totalRounds);
  const n = seats.length;
  // A single seat has nobody else to pass the story to.
  const cycle = authorDraws || n === 1 ? n : n - 1;
  const assignments = Array.from({ length: totalRounds }, (_, round) => {
    const shift = 1 + (round % cycle);
    return Object.fromEntries(
      seats.map((playerId, seat) => [playerId, (((seat - shift) % n) + n) % n]),
    );
  });
  return { assignments };
}
