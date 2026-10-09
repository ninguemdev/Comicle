import { themeSchema, type MatchAbortReason, type MatchSettings } from '@comicle/shared';

import { DomainError } from '../../platform/errors';
import type { DistributionPlan } from '../game-modes/game-mode';
import { getGameMode } from '../game-modes/registry';
import { initialPresentationCursor } from '../presentation/presentation-cursor';
import type { MatchStatus, NewPanel } from '../stories/story-repository';
import type { GameTimingConfig } from '../timing/game-timing';
import {
  emptyRound,
  type Match,
  type PanelSubmitReason,
  type Seat,
  type StoryState,
  type ThemeDraftState,
} from './match';
import {
  assertCanConfirmReading,
  assertCanSendPanel,
  everyoneConnectedReady,
  everyoneSubmitted,
  panelMeta,
  roundPanels,
  type RoundMatch,
} from './round';

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
      /** `panelIds[r][i]`: one fresh ID per round and story. */
      panelIds: readonly (readonly string[])[];
      /** R25: content of the room's previous match, deleted on start. */
      previousMatchId: string | null;
    }
  | { type: 'theme_draft'; playerId: string; text: string }
  | { type: 'theme_submit'; playerId: string; text: string }
  | {
      type: 'round_ready';
      playerId: string;
      roundIndex: number;
      /** Players connected right now (R37). */
      connected: ReadonlySet<string>;
    }
  | { type: 'panel_autosave'; playerId: string; roundIndex: number; png: Uint8Array }
  | {
      type: 'panel_submit';
      playerId: string;
      roundIndex: number;
      reason: PanelSubmitReason;
      png: Uint8Array | null;
    }
  /** Someone connected or disconnected (R37). */
  | { type: 'presence_changed'; connected: ReadonlySet<string> }
  /** The phase timer fired. */
  | { type: 'phase_deadline' }
  | { type: 'abort'; reason: MatchAbortReason };

export type MatchEffect =
  | { type: 'schedule_phase'; at: number }
  | { type: 'cancel_phase' }
  /** Write the match with its themes and stories (`newMatchRecord`). */
  | { type: 'persist_match' }
  /** R42: every panel of the round, in one transaction. */
  | { type: 'persist_round'; panels: NewPanel[] }
  | { type: 'set_match_status'; status: MatchStatus }
  /** R42: ask the clients still drawing for what is on their screen. */
  | { type: 'emit_collect'; roundIndex: number }
  | { type: 'notify_aborted'; reason: MatchAbortReason }
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

/** Everyone in `seats` is now ready; used when the reading ends (R37). */
function allReady(match: RoundMatch): RoundMatch {
  return {
    ...match,
    round: { ...match.round, ready: new Set(match.seats.map((seat) => seat.playerId)) },
  };
}

export function createMatchMachine(timing: GameTimingConfig): MatchMachine {
  function enterPhase(
    match: Match,
    phase: Match['phase'],
    now: number,
    durationMs: number | null,
  ): MatchTransition {
    const deadline = durationMs === null ? null : now + durationMs;
    return {
      match: { ...match, phase, phaseStartedAt: now, phaseDeadlineAt: deadline },
      effects: [
        deadline === null ? { type: 'cancel_phase' } : { type: 'schedule_phase', at: deadline },
      ],
    };
  }

  /** R34, R35: a round starts at reading, or straight at drawing when the mode has none. */
  function startRound(match: Match, roundIndex: number, now: number): MatchTransition {
    const next: Match = { ...match, roundIndex, round: emptyRound() };
    return getGameMode(match.settings.mode).hasReadingPhase(roundIndex)
      ? enterPhase(next, 'round_reading', now, timing.readingMs(roundIndex))
      : enterPhase(next, 'round_drawing', now, timing.drawingMs(match.settings));
  }

  /** R37, R38: drawing starts at the same instant for everyone. */
  function startDrawing(match: RoundMatch, now: number): MatchTransition {
    return enterPhase(allReady(match), 'round_drawing', now, timing.drawingMs(match.settings));
  }

  /** R29, R30, R34: the themes are final; the rounds begin. */
  function finishThemeWriting(match: Match, now: number): MatchTransition {
    const resolved: Match = { ...match, stories: resolveThemes(match), themes: new Map() };
    const { match: next, effects } = startRound(resolved, 0, now);
    return { match: next, effects: [{ type: 'persist_match' }, ...effects] };
  }

  /** R41, R42: drawing is over; the closing window collects what is still on screen. */
  function endDrawing(match: RoundMatch, now: number): MatchTransition {
    if (everyoneSubmitted(match)) {
      return finishRound(match, now);
    }
    const { match: closing, effects } = enterPhase(
      match,
      'round_closing',
      now,
      timing.roundClosingMs,
    );
    return {
      match: closing,
      effects: [...effects, { type: 'emit_collect', roundIndex: match.roundIndex }],
    };
  }

  /**
   * R42, R43, R45: resolves and persists every panel of the round, drops the drafts and moves to
   * the next round or to the presentation.
   */
  function finishRound(match: RoundMatch, now: number): MatchTransition {
    const panels = roundPanels(match);
    const finished: Match = {
      ...match,
      round: null,
      stories: match.stories.map((story, index) => {
        const panel = panels[index];
        return panel ? { ...story, panels: [...story.panels, panelMeta(panel)] } : story;
      }),
    };
    const persist: MatchEffect = { type: 'persist_round', panels };
    const nextRound = match.roundIndex + 1;
    if (nextRound < match.totalRounds) {
      const { match: next, effects } = startRound(finished, nextRound, now);
      return { match: next, effects: [persist, ...effects] };
    }
    const { match: presenting, effects } = enterPhase(
      { ...finished, presentation: initialPresentationCursor(finished.stories.length) },
      'presentation',
      now,
      null,
    );
    return {
      match: presenting,
      effects: [persist, ...effects, { type: 'set_match_status', status: 'presenting' }],
    };
  }

  function onDeadline(match: Match | null, now: number): MatchTransition {
    // A stale timer (the phase already moved on) changes nothing.
    if (match === null || match.phaseDeadlineAt === null || now < match.phaseDeadlineAt) {
      return { match, effects: [] };
    }
    if (match.phase === 'theme_writing') {
      return finishThemeWriting(match, now);
    }
    if (match.round === null) {
      return { match, effects: [] };
    }
    const round: RoundMatch = { ...match, round: match.round };
    switch (match.phase) {
      case 'round_reading':
        return startDrawing(round, now);
      case 'round_drawing':
        return endDrawing(round, now);
      case 'round_closing':
        return finishRound(round, now);
      case 'presentation':
        return { match, effects: [] };
      default:
        return match.phase satisfies never;
    }
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
      panelIds: event.panelIds,
      phase: 'theme_writing',
      phaseStartedAt: now,
      phaseDeadlineAt: deadline,
      roundIndex: -1,
      themes: new Map(event.seats.map((seat) => [seat.playerId, { draft: '', final: null }])),
      stories: [],
      round: null,
      presentation: null,
    };
    const effects: MatchEffect[] = [{ type: 'schedule_phase', at: deadline }];
    if (event.previousMatchId !== null) {
      effects.unshift({ type: 'delete_match', matchId: event.previousMatchId });
    }
    return { match: started, effects };
  }

  /** R36, R37. Confirming twice changes nothing. */
  function roundReady(
    match: Match | null,
    event: Extract<MatchEvent, { type: 'round_ready' }>,
    now: number,
  ): MatchTransition {
    assertCanConfirmReading(match, event.roundIndex, now);
    if (!match.seats.some((seat) => seat.playerId === event.playerId)) {
      throw invalidState('Só os participantes da partida leem a história.');
    }
    const ready = new Set(match.round.ready).add(event.playerId);
    const next: RoundMatch = { ...match, round: { ...match.round, ready } };
    return everyoneConnectedReady(next, event.connected)
      ? startDrawing(next, now)
      : { match: next, effects: [] };
  }

  /** R39. */
  function autosave(
    match: Match | null,
    event: Extract<MatchEvent, { type: 'panel_autosave' }>,
    now: number,
  ): MatchTransition {
    assertCanSendPanel(
      match,
      event.playerId,
      event.roundIndex,
      'autosave',
      now,
      timing.roundClosingMs,
    );
    const drafts = new Map(match.round.drafts).set(event.playerId, event.png);
    return { match: { ...match, round: { ...match.round, drafts } }, effects: [] };
  }

  /** R40–R42, R44. */
  function submit(
    match: Match | null,
    event: Extract<MatchEvent, { type: 'panel_submit' }>,
    now: number,
  ): MatchTransition {
    assertCanSendPanel(
      match,
      event.playerId,
      event.roundIndex,
      'submit',
      now,
      timing.roundClosingMs,
    );
    const finals = new Map(match.round.finals).set(event.playerId, {
      png: event.png,
      reason: event.reason,
    });
    const next: RoundMatch = { ...match, round: { ...match.round, finals } };
    // The closing window has nothing left to wait for once every panel is in.
    return everyoneSubmitted(next) ? finishRound(next, now) : { match: next, effects: [] };
  }

  /** R37: a disconnected participant no longer holds the reading. */
  function presenceChanged(
    match: Match | null,
    connected: ReadonlySet<string>,
    now: number,
  ): MatchTransition {
    if (match?.phase !== 'round_reading' || match.round === null) {
      return { match, effects: [] };
    }
    const round: RoundMatch = { ...match, round: match.round };
    return everyoneConnectedReady(round, connected)
      ? startDrawing(round, now)
      : { match, effects: [] };
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
        case 'round_ready':
          return roundReady(match, event, now);
        case 'panel_autosave':
          return autosave(match, event, now);
        case 'panel_submit':
          return submit(match, event, now);
        case 'presence_changed':
          return presenceChanged(match, event.connected, now);
        case 'phase_deadline':
          return onDeadline(match, now);
        case 'abort':
          if (match === null) {
            throw invalidState('Não há partida em andamento.');
          }
          return {
            match: null,
            effects: [
              { type: 'cancel_phase' },
              { type: 'notify_aborted', reason: event.reason },
              { type: 'delete_match', matchId: match.id },
            ],
          };
        default:
          return event satisfies never;
      }
    },
  };
}
