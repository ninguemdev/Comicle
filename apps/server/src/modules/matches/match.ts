import type { MatchPhase, MatchSettings, PanelStatus } from '@comicle/shared';

import { storyForPlayer, type DistributionPlan } from '../game-modes/game-mode';
import { getGameMode } from '../game-modes/registry';
import type { PresentationCursor } from '../presentation/presentation-cursor';
import type { NewMatch, ThemeSource } from '../stories/story-repository';

// Match state in memory (docs/modelo-de-dados.md §1). Pure data: transitions live in
// match-machine.ts.

/** A participant's place in the match (R23); the theme of `seats[i]` is told by the stories of `GameMode.themeOfStory`. */
export interface Seat {
  readonly playerId: string;
  /** Copy taken when the match starts, persisted with the theme. */
  readonly nickname: string;
  readonly themeId: string;
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

/** By panel index within what the player draws this round (0 in the collaborative mode). */
export type PanelSlots<T> = ReadonlyMap<number, T>;

/** The round in progress, by playerId; discarded when the round ends. */
export interface RoundState {
  /** R36, R37: confirmed the reading. */
  readonly ready: ReadonlySet<string>;
  /** R39, R66: latest autosave of each panel. */
  readonly drafts: ReadonlyMap<string, PanelSlots<Uint8Array>>;
  /** R40, R42, R66: final submission of each panel. */
  readonly finals: ReadonlyMap<string, PanelSlots<PanelFinal>>;
  /**
   * R38: the drawing deadline, the same for everyone. While the reading lasts it is the latest
   * possible one (reading deadline + drawing time); it becomes final when the drawing starts.
   */
  readonly drawingDeadlineAt: number;
}

export function emptyRound(drawingDeadlineAt: number): RoundState {
  return { ready: new Set(), drafts: new Map(), finals: new Map(), drawingDeadlineAt };
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
  /** One per story (R64), drawn at the start; `stories[i].id === storyIds[i]`. */
  readonly storyIds: readonly string[];
  /**
   * `panelIds[r][i][k]`: ID of panel `k` drawn for story `i` in round `r`, drawn at the start;
   * empty when story `i` is not drawn in round `r` (individual mode).
   */
  readonly panelIds: readonly (readonly (readonly string[])[])[];
  readonly phase: MatchPhase;
  readonly phaseStartedAt: number;
  readonly phaseDeadlineAt: number | null;
  /** -1 during theme_writing; the last round during the presentation. */
  readonly roundIndex: number;
  /** By playerId; only during theme_writing. */
  readonly themes: ReadonlyMap<string, ThemeDraftState>;
  /** In presentation order (R50, R64); empty until the themes are resolved. */
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

/** R62, R66: panels each participant draws per round (1 in the collaborative mode). */
export function panelsPerRound(match: Match): number {
  return getGameMode(match.settings.mode).panelsPerRound(match.settings);
}

/** R40, R66: the player handed in every panel of the round. */
export function hasHandedIn(match: Match, round: RoundState, playerId: string): boolean {
  return (round.finals.get(playerId)?.size ?? 0) >= panelsPerRound(match);
}

/** R48: the panels the player has an autosave of, in order. */
export function draftPanels(round: RoundState, playerId: string): number[] {
  return [...(round.drafts.get(playerId)?.keys() ?? [])].sort((a, b) => a - b);
}

/** `slots` of every player with `value` in panel `panelIndex` of `playerId`. */
export function withSlot<T>(
  slots: ReadonlyMap<string, PanelSlots<T>>,
  playerId: string,
  panelIndex: number,
  value: T,
): ReadonlyMap<string, PanelSlots<T>> {
  const own = new Map(slots.get(playerId)).set(panelIndex, value);
  return new Map(slots).set(playerId, own);
}

/** Row set written when the themes are resolved (arquitetura §4, Persistência). */
export function newMatchRecord(roomId: string, match: Match): NewMatch {
  // R64: in the individual mode several stories tell the same theme; it is written once.
  const themes = new Map(match.stories.map((story) => [story.themeId, story]));
  return {
    id: match.id,
    roomId,
    settings: match.settings,
    totalRounds: match.totalRounds,
    startedAt: match.startedAt,
    themes: match.seats.flatMap((seat, index) => {
      const story = themes.get(seat.themeId);
      return story
        ? [
            {
              id: story.themeId,
              authorPlayerId: story.authorPlayerId,
              authorNickname: story.authorNickname,
              text: story.themeText,
              source: story.themeSource,
              seat: index,
            },
          ]
        : [];
    }),
    stories: match.stories.map((story, position) => ({
      id: story.id,
      themeId: story.themeId,
      position,
    })),
  };
}
