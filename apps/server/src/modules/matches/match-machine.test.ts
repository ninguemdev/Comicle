import { DRAWING_SECONDS_DEFAULT, type MatchSettings } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../../platform/errors';
import { buildCollaborativePlan } from '../game-modes/collaborative/distribution';
import { defaultGameTiming } from '../timing/game-timing';
import type { Match, Seat } from './match';
import { createMatchMachine, type MatchEvent, type MatchTransition } from './match-machine';

const T0 = 1_000_000;
const THEME_DEADLINE = T0 + defaultGameTiming.themeWritingMs;
const settings: MatchSettings = {
  mode: 'collaborative',
  panelCount: { kind: 'per_player' },
  drawingSeconds: DRAWING_SECONDS_DEFAULT,
};
const players = ['ana', 'bia', 'caio'];
const seats: Seat[] = players.map((playerId) => ({
  playerId,
  nickname: playerId.toUpperCase(),
  themeId: `theme-${playerId}`,
  storyId: `story-${playerId}`,
}));
const fallbackThemes = ['Reserva 1', 'Reserva 2', 'Reserva 3', 'Reserva 4'];

const machine = createMatchMachine(defaultGameTiming);

function startEvent(previousMatchId: string | null = null): MatchEvent {
  return {
    type: 'start',
    id: 'match-1',
    settings,
    seats,
    totalRounds: seats.length,
    plan: buildCollaborativePlan(players, seats.length),
    fallbackThemes,
    previousMatchId,
  };
}

function started(): Match {
  const { match } = machine.transition(null, startEvent(), T0);
  if (!match) {
    throw new Error('partida não iniciou');
  }
  return match;
}

/** Applies events in order at `now`, returning the last transition. */
function run(match: Match | null, events: MatchEvent[], now = T0 + 1): MatchTransition {
  let result: MatchTransition = { match, effects: [] };
  for (const event of events) {
    result = machine.transition(result.match, event, now);
  }
  return result;
}

function errorCode(action: () => unknown): string | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'outro erro';
  }
}

const submit = (playerId: string, text = `Tema de ${playerId}`): MatchEvent => ({
  type: 'theme_submit',
  playerId,
  text,
});
const draft = (playerId: string, text: string): MatchEvent => ({
  type: 'theme_draft',
  playerId,
  text,
});

function drawingMatch(): Match {
  const { match } = run(
    started(),
    players.map((p) => submit(p)),
  );
  if (!match) {
    throw new Error('sem partida');
  }
  return match;
}

describe('match machine', () => {
  describe('transições', () => {
    const lobby = () => null;
    const themeWriting = () => started();
    const roundDrawing = () => drawingMatch();

    it.each([
      ['lobby', lobby, startEvent(), undefined],
      ['lobby', lobby, draft('ana', 'x'), 'INVALID_STATE'],
      ['lobby', lobby, submit('ana'), 'INVALID_STATE'],
      ['lobby', lobby, { type: 'abort' } as const, 'INVALID_STATE'],
      ['theme_writing', themeWriting, startEvent(), 'INVALID_STATE'],
      ['theme_writing', themeWriting, draft('ana', 'x'), undefined],
      ['theme_writing', themeWriting, submit('ana'), undefined],
      ['theme_writing', themeWriting, submit('espectador'), 'INVALID_STATE'],
      ['theme_writing', themeWriting, { type: 'phase_deadline' } as const, undefined],
      ['theme_writing', themeWriting, { type: 'abort' } as const, undefined],
      ['round_drawing', roundDrawing, startEvent(), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, draft('ana', 'x'), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, submit('ana'), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, { type: 'phase_deadline' } as const, undefined],
      ['round_drawing', roundDrawing, { type: 'abort' } as const, undefined],
    ])('%s + %o → %s', (_phase, state, event, expected) => {
      expect(errorCode(() => machine.transition(state(), event, T0 + 1))).toBe(expected);
    });
  });

  it('R26: o início abre a etapa de temas com prazo e agenda o timer', () => {
    const { match, effects } = machine.transition(null, startEvent(), T0);

    expect(match).toMatchObject({
      id: 'match-1',
      phase: 'theme_writing',
      roundIndex: -1,
      startedAt: T0,
      phaseDeadlineAt: THEME_DEADLINE,
      stories: [],
    });
    expect(effects).toEqual([{ type: 'schedule_phase', at: THEME_DEADLINE }]);
  });

  it('R25: o início apaga a partida anterior da sala', () => {
    const { effects } = machine.transition(null, startEvent('match-0'), T0);

    expect(effects).toContainEqual({ type: 'delete_match', matchId: 'match-0' });
  });

  it('R28: o rascunho é guardado e pode ser trocado até o envio', () => {
    const { match } = run(started(), [draft('ana', 'Primeiro'), draft('ana', 'Segundo')]);

    expect(match?.themes.get('ana')).toEqual({ draft: 'Segundo', final: null });
  });

  it('R28: depois do envio não há edição nem novo envio', () => {
    const afterSubmit = run(started(), [submit('ana')]).match;

    expect(afterSubmit?.themes.get('ana')?.final).toBe('Tema de ana');
    expect(errorCode(() => run(afterSubmit, [submit('ana')]))).toBe('INVALID_STATE');
    expect(errorCode(() => run(afterSubmit, [draft('ana', 'Outro')]))).toBe('INVALID_STATE');
  });

  it('R61: ações depois do prazo são recusadas com DEADLINE_PASSED', () => {
    expect(errorCode(() => run(started(), [submit('ana')], THEME_DEADLINE))).toBe(
      'DEADLINE_PASSED',
    );
  });

  it('R29: quando todos enviam, a etapa termina antes do prazo', () => {
    const now = T0 + 5000;
    const { match, effects } = run(
      started(),
      players.map((p) => submit(p)),
      now,
    );

    expect(match).toMatchObject({
      phase: 'round_drawing',
      roundIndex: 0,
      phaseStartedAt: now,
      phaseDeadlineAt: now + defaultGameTiming.drawingMs(settings),
    });
    expect(match?.themes.size).toBe(0);
    expect(effects).toEqual([{ type: 'cancel_phase' }, { type: 'persist_match' }]);
  });

  it('R29: com alguém faltando, a etapa continua', () => {
    const { match, effects } = run(started(), [submit('ana'), submit('bia')]);

    expect(match?.phase).toBe('theme_writing');
    expect(effects).toEqual([]);
  });

  it('R30: no prazo vale o final, senão o rascunho válido, senão um reserva; source correto', () => {
    const beforeDeadline = run(started(), [
      submit('ana', 'Final da Ana'),
      draft('bia', 'Rascunho da Bia'),
      draft('caio', 'oi'),
    ]).match;
    const { match, effects } = run(beforeDeadline, [{ type: 'phase_deadline' }], THEME_DEADLINE);

    expect(match?.phase).toBe('round_drawing');
    expect(effects).toContainEqual({ type: 'persist_match' });
    expect(
      match?.stories.map((s) => [s.authorPlayerId, s.themeText, s.themeSource, s.id, s.themeId]),
    ).toEqual([
      ['ana', 'Final da Ana', 'player', 'story-ana', 'theme-ana'],
      ['bia', 'Rascunho da Bia', 'player', 'story-bia', 'theme-bia'],
      ['caio', 'Reserva 1', 'fallback', 'story-caio', 'theme-caio'],
    ]);
  });

  it('R30: temas reserva não se repetem nem repetem um tema escrito na partida', () => {
    const beforeDeadline = run(started(), [submit('ana', 'Reserva 1')]).match;
    const { match } = run(beforeDeadline, [{ type: 'phase_deadline' }], THEME_DEADLINE);

    expect(match?.stories.map((s) => [s.themeText, s.themeSource])).toEqual([
      ['Reserva 1', 'player'],
      ['Reserva 2', 'fallback'],
      ['Reserva 3', 'fallback'],
    ]);
  });

  it('timer velho (antes do prazo ou em outra fase) não muda nada', () => {
    const match = started();
    expect(run(match, [{ type: 'phase_deadline' }], THEME_DEADLINE - 1)).toEqual({
      match,
      effects: [],
    });

    const drawing = drawingMatch();
    expect(run(drawing, [{ type: 'phase_deadline' }], THEME_DEADLINE + 1)).toEqual({
      match: drawing,
      effects: [],
    });
  });

  it('R57: abortar em qualquer fase volta ao lobby e apaga a partida', () => {
    for (const match of [started(), drawingMatch()]) {
      expect(run(match, [{ type: 'abort' }])).toEqual({
        match: null,
        effects: [{ type: 'cancel_phase' }, { type: 'delete_match', matchId: 'match-1' }],
      });
    }
  });
});
