import {
  DRAWING_SECONDS_DEFAULT,
  type GameModeId,
  type MatchSettings,
  type Rng,
} from '@comicle/shared';

import { playerForStory, storyForPlayer } from '../../src/modules/game-modes/game-mode';
import { getGameMode } from '../../src/modules/game-modes/registry';
import { hasHandedIn, type Match } from '../../src/modules/matches/match';
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
  /** Every panel ID of the match, drawn or not yet. */
  panelIds: string[];
  snapshots: MatchSnapshot[];
}

const T0 = 1_000_000;
const PNG = new Uint8Array([137, 80, 78, 71]);
const NAVIGATION = ['next', 'prev', 'showFull', 'nextStory'] as const;

/** Distinct, searchable texts: a leak shows up as a substring of the view. */
export const draftOf = (playerId: string) => `RASCUNHO-${playerId}`;
export const themeOf = (playerId: string) => `TEMA-${playerId}`;
/** Fixed width, so no ID is a substring of another. */
export const panelIdOf = (round: number, story: number, panel = 0) =>
  `PAINEL-${String(round).padStart(2, '0')}-${String(story).padStart(2, '0')}-${String(panel)}`;
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

/**
 * R38: the artist still drawing sees the story's earlier panels when the option is on; the
 * individual mode ignores it (R62, R67).
 */
export function seesReference(match: Match, viewer: string): boolean {
  const { round, settings } = match;
  if (
    settings.mode !== 'collaborative' ||
    !settings.showPreviousPanels ||
    round === null ||
    hasHandedIn(match, round, viewer)
  ) {
    return false;
  }
  return match.phase !== 'round_reading' || round.ready.has(viewer);
}

export function generateMatch(rng: Rng): GeneratedMatch {
  const machine = createMatchMachine(defaultGameTiming);
  const players = Array.from({ length: 2 + rng.nextInt(4) }, (_, i) => `p${String(i)}`);
  // R38: half of the matches show the earlier panels while drawing.
  const showPreviousPanels = rng.nextInt(2) === 1;
  // R20, R31: half of them skip the author, with one round less.
  const authorDrawsLast = rng.nextInt(2) === 1;
  // R62–R67: a third of them are individual, with 2 or 3 panels per story.
  const modeId: GameModeId = rng.nextInt(3) === 0 ? 'individual' : 'collaborative';
  const settings: MatchSettings = {
    mode: modeId,
    panelCount: { kind: 'per_player' },
    drawingSeconds: DRAWING_SECONDS_DEFAULT,
    showPreviousPanels,
    authorDrawsLast,
    individual: { panelsPerStory: 2 + rng.nextInt(2), storySeconds: 300 },
  };
  const mode = getGameMode(modeId);
  const totalRounds = mode.totalRounds(settings, players.length);
  const plan = mode.buildPlan(players, totalRounds, settings);
  const storyCount = mode.storyCount(players.length);
  const panelsPerRound = mode.panelsPerRound(settings);
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
      settings,
      seats: players.map((playerId) => ({
        playerId,
        nickname: playerId,
        themeId: `theme-${playerId}`,
      })),
      totalRounds,
      plan,
      fallbackThemes: FALLBACK_THEMES,
      storyIds: Array.from({ length: storyCount }, (_, s) => `story-${String(s)}`),
      panelIds: Array.from({ length: totalRounds }, (_, r) =>
        Array.from({ length: storyCount }, (_unused, s) =>
          playerForStory(plan, r, s) === undefined
            ? []
            : Array.from({ length: panelsPerRound }, (_x, k) => panelIdOf(r, s, k)),
        ),
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
    // Some players hand everything in, never all of them; R66: someone may hand in only part.
    const handing = subset(rng, players, players.length - 1);
    for (const playerId of players) {
      const count = handing.has(playerId) ? panelsPerRound : rng.nextInt(panelsPerRound);
      for (let panelIndex = 0; panelIndex < count; panelIndex++) {
        apply(
          {
            type: 'panel_submit',
            playerId,
            roundIndex: round,
            panelIndex,
            reason: 'done',
            png: PNG,
          },
          soon(),
        );
      }
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
        ? { action: 'goToStory', storyIndex: rng.nextInt(storyCount) }
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

  return { players, spectator: 'espectador', panelIds: current().panelIds.flat(2), snapshots };
}

/** R31: the story `playerId` works on in the snapshot's round, if any. */
export function assignedStoryIndex(match: Match, playerId: string): number | undefined {
  return match.roundIndex < 0 ? undefined : storyForPlayer(match.plan, match.roundIndex, playerId);
}
