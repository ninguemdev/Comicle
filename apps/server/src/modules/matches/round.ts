import type { PanelStatus } from '@comicle/shared';

import { DomainError } from '../../platform/errors';
import { playerForStory } from '../game-modes/game-mode';
import type { NewPanel } from '../stories/story-repository';
import { assignedStory, seatOf, type Match, type PanelMeta, type RoundState } from './match';

// Rules of a round (R36–R44), shared by the phase machine. Pure.

function invalidState(message: string): DomainError {
  return new DomainError('INVALID_STATE', message);
}

function deadlinePassed(): DomainError {
  return new DomainError('DEADLINE_PASSED', 'O tempo deste quadro acabou.');
}

export type RoundMatch = Match & { round: RoundState };

function inRound(match: Match | null): match is RoundMatch {
  return match !== null && match.round !== null;
}

/** R36: a participant confirms the reading of the current round. */
export function assertCanConfirmReading(
  match: Match | null,
  roundIndex: number,
  now: number,
): asserts match is RoundMatch {
  if (!inRound(match) || match.phase !== 'round_reading' || roundIndex !== match.roundIndex) {
    throw invalidState('Não é hora de ler a história.');
  }
  if (match.phaseDeadlineAt !== null && now >= match.phaseDeadlineAt) {
    throw new DomainError('DEADLINE_PASSED', 'O tempo de leitura acabou.');
  }
}

export type PanelAction = 'autosave' | 'submit';

/**
 * R39, R44, R61: autosaves are accepted while drawing; submissions also until the end of the
 * closing window (R42). An earlier round or a closed window answers DEADLINE_PASSED.
 */
export function assertCanSendPanel(
  match: Match | null,
  playerId: string,
  roundIndex: number,
  action: PanelAction,
  now: number,
  closingMs: number,
): asserts match is RoundMatch {
  if (match === null || match.phase === 'theme_writing' || roundIndex > match.roundIndex) {
    throw invalidState('Não é hora de desenhar.');
  }
  if (!assignedStory(match, playerId)) {
    throw invalidState('Só os participantes da partida desenham.');
  }
  if (roundIndex < match.roundIndex || !inRound(match)) {
    throw deadlinePassed();
  }
  if (match.phase === 'round_reading') {
    throw invalidState('O desenho desta rodada ainda não começou.');
  }
  if (match.round.finals.has(playerId)) {
    throw invalidState('Você já entregou este quadro.');
  }
  if (now >= sendLimit(match, action, closingMs)) {
    throw deadlinePassed();
  }
}

function sendLimit(match: RoundMatch, action: PanelAction, closingMs: number): number {
  const deadline = match.phaseDeadlineAt ?? Number.POSITIVE_INFINITY;
  if (match.phase === 'round_closing') {
    return action === 'submit' ? deadline : Number.NEGATIVE_INFINITY;
  }
  return action === 'submit' ? deadline + closingMs : deadline;
}

/** R37: every connected participant confirmed (disconnected ones count as ready). */
export function everyoneConnectedReady(match: RoundMatch, connected: ReadonlySet<string>): boolean {
  return match.seats.every(
    (seat) => match.round.ready.has(seat.playerId) || !connected.has(seat.playerId),
  );
}

/** R41: every participant handed in, disconnected ones included. */
export function everyoneSubmitted(match: RoundMatch): boolean {
  return match.seats.every((seat) => match.round.finals.has(seat.playerId));
}

interface ResolvedPanel {
  status: PanelStatus;
  png: Uint8Array | null;
}

/**
 * R42, R43: final submission > last autosave > empty. A final without image is a blank canvas
 * the player chose to hand in, so it stays empty even with an older autosave.
 */
export function resolvePanel(round: RoundState, playerId: string): ResolvedPanel {
  const final = round.finals.get(playerId);
  if (final) {
    if (final.png === null) {
      return { status: 'empty', png: null };
    }
    return { status: final.reason === 'done' ? 'complete' : 'partial', png: final.png };
  }
  const draft = round.drafts.get(playerId);
  return draft ? { status: 'partial', png: draft } : { status: 'empty', png: null };
}

/** The panels of the current round, one per story, in story order, ready to be persisted. */
export function roundPanels(match: RoundMatch): NewPanel[] {
  const { roundIndex } = match;
  return match.stories.map((story, storyIndex) => {
    const artistPlayerId = playerForStory(match.plan, roundIndex, storyIndex);
    const id = match.panelIds[roundIndex]?.[storyIndex];
    const seat = artistPlayerId === undefined ? undefined : seatOf(match, artistPlayerId);
    if (!seat || id === undefined) {
      throw new Error(`Rodada ${String(roundIndex)} sem artista ou ID para a história ${story.id}`);
    }
    return {
      id,
      storyId: story.id,
      position: roundIndex,
      artistPlayerId: seat.playerId,
      artistNickname: seat.nickname,
      ...resolvePanel(match.round, seat.playerId),
    };
  });
}

export function panelMeta(panel: NewPanel): PanelMeta {
  return {
    id: panel.id,
    position: panel.position,
    artistPlayerId: panel.artistPlayerId,
    status: panel.status,
  };
}
