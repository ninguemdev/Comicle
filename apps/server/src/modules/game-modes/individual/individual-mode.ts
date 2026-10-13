import {
  INDIVIDUAL_PANEL_COUNT_MAX,
  INDIVIDUAL_PANEL_COUNT_MIN,
  STORY_SECONDS_OPTIONS,
  type MatchSettings,
} from '@comicle/shared';

import { DomainError } from '../../../platform/errors';
import { buildCollaborativePlan } from '../collaborative/distribution';
import type { DistributionPlan, GameMode, Result } from '../game-mode';

function invalid(message: string): Result<void> {
  return { ok: false, error: new DomainError('INVALID_PAYLOAD', message) };
}

const storySecondsOptions: readonly number[] = STORY_SECONDS_OPTIONS;

/** R18, R62: only the individual fields matter here; the collaborative ones are ignored. */
function validateSettings(settings: MatchSettings): Result<void> {
  if (settings.mode !== 'individual') {
    return invalid('Modo de jogo indisponível.');
  }
  const { panelsPerStory, storySeconds } = settings.individual;
  if (
    !Number.isInteger(panelsPerStory) ||
    panelsPerStory < INDIVIDUAL_PANEL_COUNT_MIN ||
    panelsPerStory > INDIVIDUAL_PANEL_COUNT_MAX
  ) {
    return invalid('Quantidade de quadros inválida.');
  }
  if (!storySecondsOptions.includes(storySeconds)) {
    return invalid('Tempo por história inválido.');
  }
  return { ok: true, value: undefined };
}

/** Versions of each theme: one per other player (R62). */
function versionsPerTheme(participantCount: number): number {
  return Math.max(1, participantCount - 1);
}

/** R62: every player draws every theme but their own, one per round. */
function totalRounds(_settings: MatchSettings, participantCount: number): number {
  return versionsPerTheme(participantCount);
}

/** R65: every round starts straight at drawing; there is nothing earlier to read. */
function hasReadingPhase(): boolean {
  return false;
}

/**
 * R63, R64: the collaborative rotation with the author skipped (R31 with `C = N − 1`) picks the
 * theme; the version of theme `t` drawn in round `r` is story `t × (N − 1) + r`, so the stories
 * come ordered by theme and, within it, by round.
 */
function buildPlan(seats: readonly string[], rounds: number): DistributionPlan {
  const perTheme = versionsPerTheme(seats.length);
  const themes = buildCollaborativePlan(seats, rounds, { authorDraws: false });
  return {
    assignments: themes.assignments.map((round, roundIndex) =>
      Object.fromEntries(
        Object.entries(round).map(([playerId, theme]) => [playerId, theme * perTheme + roundIndex]),
      ),
    ),
  };
}

export const individualMode: GameMode = {
  id: 'individual',
  validateSettings,
  totalRounds,
  buildPlan,
  hasReadingPhase,
  storyCount: (participantCount) => participantCount * versionsPerTheme(participantCount),
  panelsPerRound: (settings) => settings.individual.panelsPerStory,
  themeOfStory: (storyIndex, participantCount) =>
    Math.floor(storyIndex / versionsPerTheme(participantCount)),
};
