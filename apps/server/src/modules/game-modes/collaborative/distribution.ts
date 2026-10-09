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
 * R31: in round `r`, story `s_i` goes to seat `(i + 1 + (r mod N)) mod N`. Inverting it, the
 * player in seat `j` draws story `(j − 1 − (r mod N)) mod N`. The rotation starts at the
 * neighbour, so with `N` rounds the author draws the last panel of their own story (D8).
 */
export function buildCollaborativePlan(
  seats: readonly string[],
  totalRounds: number,
): DistributionPlan {
  assertValidInput(seats, totalRounds);
  const n = seats.length;
  const assignments = Array.from({ length: totalRounds }, (_, round) =>
    Object.fromEntries(
      seats.map((playerId, seat) => [playerId, (((seat - 1 - (round % n)) % n) + n) % n]),
    ),
  );
  return { assignments };
}
