import type { MatchPhase, MatchSettings, PanelStatus } from '@comicle/shared';

import { storyForPlayer, type DistributionPlan } from '../game-modes/game-mode';
import type { PresentationCursor } from '../presentation/presentation-cursor';
import type { NewMatch, ThemeSource } from '../stories/story-repository';

// Match state in memory (docs/modelo-de-dados.md §1). Pure data: transitions live in
// match-machine.ts.

/** A participant's place in the match (R23); story `i` belongs to `seats[i]`. */
export interface Seat {
  readonly playerId: string;
  /** Copy taken when the match starts, persisted with the theme. */
  readonly nickname: string;
  readonly themeId: string;
  readonly storyId: string;
}

/** R28: the latest draft and, once submitted, the final theme. */
export interface ThemeDraftState {
  readonly draft: string;
  readonly final: string | null;
}

export interface PanelMeta {
  readonly id: string;
  readonly position: number;
  readonly artistPlayerId: string;
  readonly status: PanelStatus;
}

export interface StoryState {
  readonly id: string;
  readonly themeId: string;
  readonly authorPlayerId: string;
  readonly authorNickname: string;
  readonly themeText: string;
  readonly themeSource: ThemeSource;
  /** Already persisted, in order. */
  readonly panels: readonly PanelMeta[];
}

export type PanelSubmitReason = 'done' | 'timeout';

/** R40, R42: what a player handed in; `png` is `null` for a blank canvas. */
export interface PanelFinal {
  readonly png: Uint8Array | null;
  readonly reason: PanelSubmitReason;
}

/** The round in progress, by playerId; discarded when the round ends. */
export interface RoundState {
  /** R36, R37: confirmed the reading. */
  readonly ready: ReadonlySet<string>;
  /** R39: latest autosave. */
  readonly drafts: ReadonlyMap<string, Uint8Array>;
  /** R40, R42. */
  readonly finals: ReadonlyMap<string, PanelFinal>;
}

export function emptyRound(): RoundState {
  return { ready: new Set(), drafts: new Map(), finals: new Map() };
}

export interface Match {
  readonly id: string;
  readonly settings: MatchSettings;
  readonly startedAt: number;
  readonly seats: readonly Seat[];
  readonly totalRounds: number;
  readonly plan: DistributionPlan;
  /** R30: fallback themes already shuffled; used in order, never repeated. */
  readonly fallbackThemes: readonly string[];
  /** `panelIds[r][i]`: ID of the panel drawn for story `i` in round `r`, drawn at the start. */
  readonly panelIds: readonly (readonly string[])[];
  readonly phase: MatchPhase;
  readonly phaseStartedAt: number;
  readonly phaseDeadlineAt: number | null;
  /** -1 during theme_writing; the last round during the presentation. */
  readonly roundIndex: number;
  /** By playerId; only during theme_writing. */
  readonly themes: ReadonlyMap<string, ThemeDraftState>;
  /** Index = seat of the author; empty until the themes are resolved. */
  readonly stories: readonly StoryState[];
  /** Only during the rounds (reading, drawing, closing). */
  readonly round: RoundState | null;
  /** Only in `presentation`. */
  readonly presentation: PresentationCursor | null;
}

/** Members outside `seats` (disconnected at the start or joined later) are spectators (R10, R24). */
export function isParticipant(match: Match, playerId: string): boolean {
  return match.seats.some((seat) => seat.playerId === playerId);
}

export function seatOf(match: Match, playerId: string): Seat | undefined {
  return match.seats.find((seat) => seat.playerId === playerId);
}

/** R31: the story `playerId` works on in the current round, if any. */
export function assignedStory(match: Match, playerId: string): StoryState | undefined {
  if (match.roundIndex < 0) {
    return undefined;
  }
  const index = storyForPlayer(match.plan, match.roundIndex, playerId);
  return index === undefined ? undefined : match.stories[index];
}

/** Row set written when the themes are resolved (arquitetura §4, Persistência). */
export function newMatchRecord(roomId: string, match: Match): NewMatch {
  return {
    id: match.id,
    roomId,
    settings: match.settings,
    totalRounds: match.totalRounds,
    startedAt: match.startedAt,
    themes: match.stories.map((story, seat) => ({
      id: story.themeId,
      authorPlayerId: story.authorPlayerId,
      authorNickname: story.authorNickname,
      text: story.themeText,
      source: story.themeSource,
      seat,
    })),
    stories: match.stories.map((story, position) => ({
      id: story.id,
      themeId: story.themeId,
      position,
    })),
  };
}
