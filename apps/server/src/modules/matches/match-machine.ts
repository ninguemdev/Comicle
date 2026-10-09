import { themeSchema, type MatchSettings } from '@comicle/shared';

import { DomainError } from '../../platform/errors';
import type { DistributionPlan } from '../game-modes/game-mode';
import type { GameTimingConfig } from '../timing/game-timing';
import type { Match, Seat, StoryState, ThemeDraftState } from './match';

// Phase machine (arquitetura §4): (state, event, now) → { state, effects }. Pure: ids, seat
// order and fallback themes arrive ready in the `start` event; effects are data the service runs.

export type MatchEvent =
  | {
      type: 'start';
      id: string;
      settings: MatchSettings;
      /** Already shuffled (R23). */
      seats: readonly Seat[];
      totalRounds: number;
      plan: DistributionPlan;
      /** Already shuffled (R30). */
      fallbackThemes: readonly string[];
      /** R25: content of the room's previous match, deleted on start. */
      previousMatchId: string | null;
    }
  | { type: 'theme_draft'; playerId: string; text: string }
  | { type: 'theme_submit'; playerId: string; text: string }
  /** The phase timer fired. */
  | { type: 'phase_deadline' }
  | { type: 'abort' };

export type MatchEffect =
  | { type: 'schedule_phase'; at: number }
  | { type: 'cancel_phase' }
  /** Write the match with its themes and stories (`newMatchRecord`). */
  | { type: 'persist_match' }
  | { type: 'delete_match'; matchId: string };

export interface MatchTransition {
  /** `null`: no match, the room is in the lobby. */
  match: Match | null;
  effects: MatchEffect[];
}

export interface MatchMachine {
  transition(match: Match | null, event: MatchEvent, now: number): MatchTransition;
}

function invalidState(message: string): DomainError {
  return new DomainError('INVALID_STATE', message);
}

function assertThemeWriting(match: Match | null, now: number): asserts match is Match {
  if (match?.phase !== 'theme_writing') {
    throw invalidState('Não é hora de escrever o tema.');
  }
  if (match.phaseDeadlineAt !== null && now >= match.phaseDeadlineAt) {
    throw new DomainError('DEADLINE_PASSED', 'O tempo para escrever o tema acabou.');
  }
}

function writableTheme(match: Match, playerId: string): ThemeDraftState {
  const theme = match.themes.get(playerId);
  if (!theme) {
    throw invalidState('Só os participantes da partida escrevem temas.');
  }
  if (theme.final !== null) {
    throw invalidState('Você já enviou o seu tema.');
  }
  return theme;
}

function withTheme(match: Match, playerId: string, theme: ThemeDraftState): Match {
  const themes = new Map(match.themes);
  themes.set(playerId, theme);
  return { ...match, themes };
}

/** A draft counts only if it would be accepted as a final theme (R27). */
function validDraft(draft: string): string | null {
  const parsed = themeSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
}

/**
 * R30: final theme, else the last valid draft, else the next fallback theme not used in this
 * match (including the themes the players wrote).
 */
export function resolveThemes(match: Match): StoryState[] {
  const chosen = match.seats.map((seat) => {
    const theme = match.themes.get(seat.playerId);
    return theme ? (theme.final ?? validDraft(theme.draft)) : null;
  });
  const used = new Set(chosen.filter((text) => text !== null));
  const fallbacks = match.fallbackThemes.filter((text) => !used.has(text));
  return match.seats.map((seat, index) => {
    const own = chosen[index] ?? null;
    const text = own ?? fallbacks.shift();
    if (text === undefined) {
      throw new Error('Temas reserva insuficientes para a partida');
    }
    return {
      id: seat.storyId,
      themeId: seat.themeId,
      authorPlayerId: seat.playerId,
      authorNickname: seat.nickname,
      themeText: text,
      themeSource: own === null ? 'fallback' : 'player',
      panels: [],
    };
  });
}

export function createMatchMachine(timing: GameTimingConfig): MatchMachine {
  /** R29, R30, R34: the themes are final; round 0 starts straight at drawing. */
  function finishThemeWriting(match: Match, now: number): MatchTransition {
    return {
      match: {
        ...match,
        stories: resolveThemes(match),
        themes: new Map(),
        phase: 'round_drawing',
        roundIndex: 0,
        phaseStartedAt: now,
        phaseDeadlineAt: now + timing.drawingMs(match.settings),
      },
      effects: [{ type: 'cancel_phase' }, { type: 'persist_match' }],
    };
  }

  function start(match: Match | null, event: Extract<MatchEvent, { type: 'start' }>, now: number) {
    if (match !== null) {
      throw invalidState('Já existe uma partida em andamento.');
    }
    const deadline = now + timing.themeWritingMs;
    const started: Match = {
      id: event.id,
      settings: event.settings,
      startedAt: now,
      seats: event.seats,
      totalRounds: event.totalRounds,
      plan: event.plan,
      fallbackThemes: event.fallbackThemes,
      phase: 'theme_writing',
      phaseStartedAt: now,
      phaseDeadlineAt: deadline,
      roundIndex: -1,
      themes: new Map(event.seats.map((seat) => [seat.playerId, { draft: '', final: null }])),
      stories: [],
    };
    const effects: MatchEffect[] = [{ type: 'schedule_phase', at: deadline }];
    if (event.previousMatchId !== null) {
      effects.unshift({ type: 'delete_match', matchId: event.previousMatchId });
    }
    return { match: started, effects };
  }

  return {
    transition(match, event, now) {
      switch (event.type) {
        case 'start':
          return start(match, event, now);
        case 'theme_draft': {
          assertThemeWriting(match, now);
          const theme = writableTheme(match, event.playerId);
          return {
            match: withTheme(match, event.playerId, { ...theme, draft: event.text }),
            effects: [],
          };
        }
        case 'theme_submit': {
          assertThemeWriting(match, now);
          const theme = writableTheme(match, event.playerId);
          const next = withTheme(match, event.playerId, { ...theme, final: event.text });
          const allSubmitted = [...next.themes.values()].every((t) => t.final !== null);
          return allSubmitted ? finishThemeWriting(next, now) : { match: next, effects: [] };
        }
        case 'phase_deadline':
          // A stale timer (the phase already moved on) changes nothing.
          if (
            match?.phase === 'theme_writing' &&
            match.phaseDeadlineAt !== null &&
            now >= match.phaseDeadlineAt
          ) {
            return finishThemeWriting(match, now);
          }
          return { match, effects: [] };
        case 'abort':
          if (match === null) {
            throw invalidState('Não há partida em andamento.');
          }
          return {
            match: null,
            effects: [{ type: 'cancel_phase' }, { type: 'delete_match', matchId: match.id }],
          };
        default:
          return event satisfies never;
      }
    },
  };
}
