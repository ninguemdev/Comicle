import { DRAWING_SECONDS_DEFAULT, type Rng } from '@comicle/shared';

import { buildCollaborativePlan } from '../../src/modules/game-modes/collaborative/distribution';
import { storyForPlayer } from '../../src/modules/game-modes/game-mode';
import type { Match } from '../../src/modules/matches/match';
import {
  createMatchMachine,
  type MatchEvent,
  type MatchTransition,
} from '../../src/modules/matches/match-machine';
import type { PresentationAction } from '../../src/modules/presentation/presentation-cursor';
import { defaultGameTiming } from '../../src/modules/timing/game-timing';
import { DomainError } from '../../src/platform/errors';

// Whole matches driven through the real phase machine with random choices (T19): every moment a
// player could see is a snapshot, for the privacy and image-access matrices.

export interface MatchSnapshot {
  /** e.g. `round_reading r1` or `presentation 2:panel(1)`. */
  label: string;
  match: Match;
}

export interface GeneratedMatch {
  players: string[];
  /** Watches from outside `seats` (R10). */
  spectator: string;
  snapshots: MatchSnapshot[];
}

const T0 = 1_000_000;
const PNG = new Uint8Array([137, 80, 78, 71]);
const NAVIGATION = ['next', 'prev', 'showFull', 'nextStory'] as const;

/** Distinct, searchable texts: a leak shows up as a substring of the view. */
export const draftOf = (playerId: string) => `RASCUNHO-${playerId}`;
export const themeOf = (playerId: string) => `TEMA-${playerId}`;
export const panelIdOf = (round: number, story: number) =>
  `PAINEL-${String(round)}-${String(story)}`;
export const FALLBACK_THEMES = Array.from({ length: 8 }, (_, i) => `RESERVA-${String(i)}`);

function subset(rng: Rng, items: string[], max = items.length): Set<string> {
  const size = rng.nextInt(max + 1);
  const pool = [...items];
  const chosen = new Set<string>();
  while (chosen.size < size && pool.length > 0) {
    chosen.add(pool.splice(rng.nextInt(pool.length), 1)[0] ?? '');
  }
  return chosen;
}

function stepLabel(match: Match): string {
  const cursor = match.presentation;
  if (!cursor) {
    return match.phase;
  }
  if (cursor.status === 'finished') {
    return 'presentation finished';
  }
  const { step } = cursor;
  const kind = step.kind === 'panel' ? `panel(${String(step.position)})` : step.kind;
  return `presentation ${String(cursor.storyIndex)}:${kind}`;
}

export function generateMatch(rng: Rng): GeneratedMatch {
  const machine = createMatchMachine(defaultGameTiming);
  const players = Array.from({ length: 2 + rng.nextInt(4) }, (_, i) => `p${String(i)}`);
  const totalRounds = players.length;
  const snapshots: MatchSnapshot[] = [];
  let match: Match | null = null;

  const apply = (event: MatchEvent, now: number): MatchTransition => {
    const result = machine.transition(match, event, now);
    match = result.match;
    return result;
  };
  const current = (): Match => {
    if (match === null) {
      throw new Error('a partida acabou');
    }
    return match;
  };
  const snap = (suffix = '') => {
    const state = current();
    snapshots.push({ label: `${stepLabel(state)}${suffix}`, match: state });
  };
  const atDeadline = () => current().phaseDeadlineAt ?? T0;
  const soon = () => current().phaseStartedAt + 1;

  apply(
    {
      type: 'start',
      id: 'match-gerada',
      settings: {
        mode: 'collaborative',
        panelCount: { kind: 'per_player' },
        drawingSeconds: DRAWING_SECONDS_DEFAULT,
      },
      seats: players.map((playerId) => ({
        playerId,
        nickname: playerId,
        themeId: `theme-${playerId}`,
        storyId: `story-${playerId}`,
      })),
      totalRounds,
      plan: buildCollaborativePlan(players, totalRounds),
      fallbackThemes: FALLBACK_THEMES,
      panelIds: Array.from({ length: totalRounds }, (_, r) =>
        players.map((_p, s) => panelIdOf(r, s)),
      ),
      previousMatchId: null,
    },
    T0,
  );

  // Themes: some drafts, some finals (never all, so the phase is still open for the snapshot).
  for (const playerId of subset(rng, players)) {
    apply({ type: 'theme_draft', playerId, text: draftOf(playerId) }, soon());
  }
  for (const playerId of subset(rng, players, players.length - 1)) {
    apply({ type: 'theme_submit', playerId, text: themeOf(playerId) }, soon());
  }
  snap();
  apply({ type: 'phase_deadline' }, atDeadline());

  const everyone = new Set(players);
  for (let round = 0; round < totalRounds; round++) {
    if (current().phase === 'round_reading') {
      for (const playerId of subset(rng, players, players.length - 1)) {
        apply({ type: 'round_ready', playerId, roundIndex: round, connected: everyone }, soon());
      }
      snap(` r${String(round)}`);
      apply({ type: 'phase_deadline' }, atDeadline());
    }
    for (const playerId of subset(rng, players, players.length - 1)) {
      apply(
        { type: 'panel_submit', playerId, roundIndex: round, reason: 'done', png: PNG },
        soon(),
      );
    }
    snap(` r${String(round)}`);
    apply({ type: 'phase_deadline' }, atDeadline());
    if (current().phase === 'round_closing') {
      snap(` r${String(round)}`);
      apply({ type: 'phase_deadline' }, atDeadline());
    }
  }

  snap();
  for (let step = 0, steps = 5 + rng.nextInt(25); step < steps; step++) {
    const kind = rng.nextInt(NAVIGATION.length + 1);
    const action: PresentationAction =
      kind === NAVIGATION.length
        ? { action: 'goToStory', storyIndex: rng.nextInt(players.length) }
        : { action: NAVIGATION[kind] ?? 'next' };
    try {
      apply({ type: 'presentation_navigate', action }, T0);
    } catch (error) {
      // goToStory beyond maxStoryReached (R52): refused, nothing changed.
      if (!(error instanceof DomainError)) throw error;
      continue;
    }
    snap();
  }

  return { players, spectator: 'espectador', snapshots };
}

/** R31: the story `playerId` works on in the snapshot's round, if any. */
export function assignedStoryIndex(match: Match, playerId: string): number | undefined {
  return match.roundIndex < 0 ? undefined : storyForPlayer(match.plan, match.roundIndex, playerId);
}
