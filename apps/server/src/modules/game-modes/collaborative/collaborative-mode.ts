import {
  DRAWING_SECONDS_OPTIONS,
  FIXED_PANEL_COUNT_MAX,
  FIXED_PANEL_COUNT_MIN,
  type MatchSettings,
} from '@comicle/shared';

import { DomainError } from '../../../platform/errors';
import type { GameMode, Result } from '../game-mode';
import { buildCollaborativePlan } from './distribution';

function invalid(message: string): Result<void> {
  return { ok: false, error: new DomainError('INVALID_PAYLOAD', message) };
}

const drawingSecondsOptions: readonly number[] = DRAWING_SECONDS_OPTIONS;

/** R18: the schema already checks this at the edge; the mode re-checks before a match starts. */
function validateSettings(settings: MatchSettings): Result<void> {
  if (settings.mode !== 'collaborative') {
    return invalid('Modo de jogo indisponível.');
  }
  const { panelCount } = settings;
  if (
    panelCount.kind === 'fixed' &&
    (!Number.isInteger(panelCount.value) ||
      panelCount.value < FIXED_PANEL_COUNT_MIN ||
      panelCount.value > FIXED_PANEL_COUNT_MAX)
  ) {
    return invalid('Quantidade de quadros inválida.');
  }
  if (!drawingSecondsOptions.includes(settings.drawingSeconds)) {
    return invalid('Tempo por quadrinho inválido.');
  }
  return { ok: true, value: undefined };
}

/**
 * R20: one round per participant (one less when the author does not draw their own story), or
 * the fixed amount chosen by the host.
 */
function totalRounds(settings: MatchSettings, participantCount: number): number {
  switch (settings.panelCount.kind) {
    case 'per_player':
      return settings.authorDrawsLast ? participantCount : Math.max(1, participantCount - 1);
    case 'fixed':
      return settings.panelCount.value;
    default:
      return settings.panelCount satisfies never;
  }
}

/** R34, R35: round 0 starts straight at drawing; every later round starts with reading. */
function hasReadingPhase(roundIndex: number): boolean {
  return roundIndex > 0;
}

export const collaborativeMode: GameMode = {
  id: 'collaborative',
  validateSettings,
  totalRounds,
  buildPlan: (seats, rounds, settings) =>
    buildCollaborativePlan(seats, rounds, { authorDraws: settings.authorDrawsLast }),
  hasReadingPhase,
  storyCount: (participantCount) => participantCount,
  panelsPerRound: () => 1,
  themeOfStory: (storyIndex) => storyIndex,
};
