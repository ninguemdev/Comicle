import type { GameModeId, MatchSettings } from '@comicle/shared';

import type { DomainError } from '../../platform/errors';

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

/**
 * Who draws which story in every round, computed once at match start (R33).
 * `assignments[r][playerId]` is the index of the story that player draws in round `r`; story `i`
 * belongs to the player in seat `i`.
 */
export interface DistributionPlan {
  readonly assignments: readonly Readonly<Record<string, number>>[];
}

/** Everything that varies between game modes (arquitetura §4); rooms, drawing and presentation stay the same. */
export interface GameMode {
  readonly id: GameModeId;
  validateSettings(settings: MatchSettings): Result<void>;
  totalRounds(settings: MatchSettings, participantCount: number): number;
  buildPlan(seats: readonly string[], totalRounds: number): DistributionPlan;
  hasReadingPhase(roundIndex: number): boolean;
}

/** Index of the story `playerId` draws in round `roundIndex`, or `undefined` for non-participants. */
export function storyForPlayer(
  plan: DistributionPlan,
  roundIndex: number,
  playerId: string,
): number | undefined {
  const round = plan.assignments[roundIndex];
  // hasOwn keeps ids such as "constructor" from hitting Object.prototype.
  return round && Object.hasOwn(round, playerId) ? round[playerId] : undefined;
}

/** Who draws story `storyIndex` in round `roundIndex`, or `undefined` when out of range. */
export function playerForStory(
  plan: DistributionPlan,
  roundIndex: number,
  storyIndex: number,
): string | undefined {
  const round = plan.assignments[roundIndex] ?? {};
  return Object.keys(round).find((playerId) => round[playerId] === storyIndex);
}
