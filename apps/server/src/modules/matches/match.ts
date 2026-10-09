import type { MatchPhase, MatchSettings, PanelStatus } from '@comicle/shared';

import type { DistributionPlan } from '../game-modes/game-mode';
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

export interface Match {
  readonly id: string;
  readonly settings: MatchSettings;
  readonly startedAt: number;
  readonly seats: readonly Seat[];
  readonly totalRounds: number;
  readonly plan: DistributionPlan;
  /** R30: fallback themes already shuffled; used in order, never repeated. */
  readonly fallbackThemes: readonly string[];
  readonly phase: MatchPhase;
  readonly phaseStartedAt: number;
  readonly phaseDeadlineAt: number | null;
  /** -1 during theme_writing. */
  readonly roundIndex: number;
  /** By playerId; only during theme_writing. */
  readonly themes: ReadonlyMap<string, ThemeDraftState>;
  /** Index = seat of the author; empty until the themes are resolved. */
  readonly stories: readonly StoryState[];
}

/** Members outside `seats` (disconnected at the start or joined later) are spectators (R10, R24). */
export function isParticipant(match: Match, playerId: string): boolean {
  return match.seats.some((seat) => seat.playerId === playerId);
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
