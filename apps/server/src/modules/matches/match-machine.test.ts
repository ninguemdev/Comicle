import { DRAWING_SECONDS_DEFAULT, type MatchSettings } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../../platform/errors';
import { buildCollaborativePlan } from '../game-modes/collaborative/distribution';
import type { NewPanel } from '../stories/story-repository';
import { defaultGameTiming } from '../timing/game-timing';
import type { Match, Seat } from './match';
import {
  createMatchMachine,
  type MatchEffect,
  type MatchEvent,
  type MatchTransition,
} from './match-machine';

const T0 = 1_000_000;
const THEME_DEADLINE = T0 + defaultGameTiming.themeWritingMs;
const DRAWING_MS = DRAWING_SECONDS_DEFAULT * 1000;
const CLOSING_MS = defaultGameTiming.roundClosingMs;
const settings: MatchSettings = {
  mode: 'collaborative',
  panelCount: { kind: 'per_player' },
  drawingSeconds: DRAWING_SECONDS_DEFAULT,
};
const players = ['ana', 'bia', 'caio'];
const everyone: ReadonlySet<string> = new Set(players);
const seats: Seat[] = players.map((playerId) => ({
  playerId,
  nickname: playerId.toUpperCase(),
  themeId: `theme-${playerId}`,
  storyId: `story-${playerId}`,
}));
const fallbackThemes = ['Reserva 1', 'Reserva 2', 'Reserva 3', 'Reserva 4'];
const png = (marker: number) => new Uint8Array([marker]);

const machine = createMatchMachine(defaultGameTiming);

function startEvent(previousMatchId: string | null = null, totalRounds = seats.length): MatchEvent {
  return {
    type: 'start',
    id: 'match-1',
    settings,
    seats,
    totalRounds,
    plan: buildCollaborativePlan(players, totalRounds),
    fallbackThemes,
    panelIds: Array.from({ length: totalRounds }, (_, round) =>
      players.map((author) => `panel-${String(round)}-${author}`),
    ),
    previousMatchId,
  };
}

function started(totalRounds = seats.length): Match {
  const { match } = machine.transition(null, startEvent(null, totalRounds), T0);
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

function present(match: Match | null): Match {
  if (!match) {
    throw new Error('sem partida');
  }
  return match;
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
const ready = (playerId: string, roundIndex = 1, connected = everyone): MatchEvent => ({
  type: 'round_ready',
  playerId,
  roundIndex,
  connected,
});
const autosave = (playerId: string, marker: number, roundIndex = 0): MatchEvent => ({
  type: 'panel_autosave',
  playerId,
  roundIndex,
  png: png(marker),
});
const done = (playerId: string, marker: number | null, roundIndex = 0): MatchEvent => ({
  type: 'panel_submit',
  playerId,
  roundIndex,
  reason: 'done',
  png: marker === null ? null : png(marker),
});
const timeout = (playerId: string, marker: number, roundIndex = 0): MatchEvent => ({
  type: 'panel_submit',
  playerId,
  roundIndex,
  reason: 'timeout',
  png: png(marker),
});
const deadline: MatchEvent = { type: 'phase_deadline' };
const abort: MatchEvent = { type: 'abort', reason: 'host' };
const nextStep: MatchEvent = { type: 'presentation_navigate', action: { action: 'next' } };
const endPresentation: MatchEvent = { type: 'presentation_end' };

/** Round 0 drawing, started at T0 + 1. */
function drawingMatch(totalRounds = seats.length): Match {
  return present(
    run(
      started(totalRounds),
      players.map((p) => submit(p)),
    ).match,
  );
}

const DRAWING_DEADLINE = T0 + 1 + DRAWING_MS;

/** Round 0 closing: everyone but caio handed in, then the drawing time ran out. */
function closingMatch(): Match {
  const drawing = run(drawingMatch(), [done('ana', 1), done('bia', 2)]).match;
  return present(run(drawing, [deadline], DRAWING_DEADLINE).match);
}

/** Round `roundIndex` reading, reached by everyone handing in every earlier round. */
function readingMatch(roundIndex = 1, totalRounds = seats.length): { match: Match; at: number } {
  let match = drawingMatch(totalRounds);
  let at = T0 + 1;
  for (let round = 0; round < roundIndex; round++) {
    at += 1000;
    if (round > 0) {
      match = present(
        run(
          match,
          players.map((p) => ready(p, round)),
          at,
        ).match,
      );
    }
    match = present(
      run(
        match,
        players.map((p) => done(p, round + 1, round)),
        at,
      ).match,
    );
  }
  return { match, at };
}

function persisted(effects: MatchEffect[]): NewPanel[] {
  const effect = effects.find((e) => e.type === 'persist_round');
  if (effect?.type !== 'persist_round') {
    throw new Error('a rodada não foi persistida');
  }
  return effect.panels;
}

describe('match machine', () => {
  describe('transições', () => {
    const lobby = () => null;
    const themeWriting = () => started();
    const roundDrawing = () => drawingMatch();
    const roundReading = () => readingMatch().match;
    const roundClosing = () => closingMatch();
    const presentation = () => readingMatch(3).match;

    it.each([
      ['lobby', lobby, startEvent(), undefined],
      ['lobby', lobby, draft('ana', 'x'), 'INVALID_STATE'],
      ['lobby', lobby, submit('ana'), 'INVALID_STATE'],
      ['lobby', lobby, ready('ana'), 'INVALID_STATE'],
      ['lobby', lobby, done('ana', 1), 'INVALID_STATE'],
      ['lobby', lobby, abort, 'INVALID_STATE'],
      ['lobby', lobby, nextStep, 'INVALID_STATE'],
      ['lobby', lobby, endPresentation, 'INVALID_STATE'],
      ['theme_writing', themeWriting, startEvent(), 'INVALID_STATE'],
      ['theme_writing', themeWriting, draft('ana', 'x'), undefined],
      ['theme_writing', themeWriting, submit('ana'), undefined],
      ['theme_writing', themeWriting, submit('espectador'), 'INVALID_STATE'],
      ['theme_writing', themeWriting, ready('ana', 0), 'INVALID_STATE'],
      ['theme_writing', themeWriting, done('ana', 1), 'INVALID_STATE'],
      ['theme_writing', themeWriting, deadline, undefined],
      ['theme_writing', themeWriting, abort, undefined],
      ['theme_writing', themeWriting, nextStep, 'INVALID_STATE'],
      ['theme_writing', themeWriting, endPresentation, 'INVALID_STATE'],
      ['round_drawing', roundDrawing, startEvent(), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, draft('ana', 'x'), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, submit('ana'), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, ready('ana', 0), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, autosave('ana', 1), undefined],
      ['round_drawing', roundDrawing, done('ana', 1), undefined],
      ['round_drawing', roundDrawing, done('espectador', 1), 'INVALID_STATE'],
      ['round_drawing', roundDrawing, deadline, undefined],
      ['round_drawing', roundDrawing, abort, undefined],
      ['round_drawing', roundDrawing, nextStep, 'INVALID_STATE'],
      ['round_reading', roundReading, ready('ana'), undefined],
      ['round_reading', roundReading, ready('espectador'), 'INVALID_STATE'],
      ['round_reading', roundReading, ready('ana', 2), 'INVALID_STATE'],
      ['round_reading', roundReading, autosave('ana', 1, 1), 'INVALID_STATE'],
      ['round_reading', roundReading, done('ana', 1, 1), 'INVALID_STATE'],
      ['round_reading', roundReading, abort, undefined],
      ['round_reading', roundReading, endPresentation, 'INVALID_STATE'],
      ['round_closing', roundClosing, done('caio', 3), undefined],
      ['round_closing', roundClosing, autosave('caio', 3), 'DEADLINE_PASSED'],
      ['round_closing', roundClosing, ready('caio', 0), 'INVALID_STATE'],
      ['round_closing', roundClosing, abort, undefined],
      ['round_closing', roundClosing, nextStep, 'INVALID_STATE'],
      ['presentation', presentation, done('ana', 1, 2), 'DEADLINE_PASSED'],
      ['presentation', presentation, ready('ana', 2), 'INVALID_STATE'],
      ['presentation', presentation, startEvent(), 'INVALID_STATE'],
      ['presentation', presentation, abort, undefined],
      ['presentation', presentation, nextStep, undefined],
      ['presentation', presentation, endPresentation, undefined],
    ])('%s + %o → %s', (_phase, state, event, expected) => {
      expect(errorCode(() => machine.transition(state(), event, T0 + 2))).toBe(expected);
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
      round: null,
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

  it('R29, R34: quando todos enviam, a etapa termina antes do prazo e a rodada 0 começa no desenho', () => {
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
      phaseDeadlineAt: now + DRAWING_MS,
    });
    expect(match?.themes.size).toBe(0);
    expect(match?.round?.finals.size).toBe(0);
    expect(effects).toEqual([
      { type: 'persist_match' },
      { type: 'schedule_phase', at: now + DRAWING_MS },
    ]);
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
    const { match, effects } = run(beforeDeadline, [deadline], THEME_DEADLINE);

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
    const { match } = run(beforeDeadline, [deadline], THEME_DEADLINE);

    expect(match?.stories.map((s) => [s.themeText, s.themeSource])).toEqual([
      ['Reserva 1', 'player'],
      ['Reserva 2', 'fallback'],
      ['Reserva 3', 'fallback'],
    ]);
  });

  it('timer velho (antes do prazo ou em outra fase) não muda nada', () => {
    const match = started();
    expect(run(match, [deadline], THEME_DEADLINE - 1)).toEqual({ match, effects: [] });

    const drawing = drawingMatch();
    expect(run(drawing, [deadline], DRAWING_DEADLINE - 1)).toEqual({
      match: drawing,
      effects: [],
    });
  });

  describe('leitura', () => {
    it('R35: a leitura das rodadas 1 e 5 dura 20 s e 40 s; na rodada 20 o limite é 60 s', () => {
      for (const [roundIndex, seconds] of [
        [1, 20],
        [5, 40],
      ] as const) {
        const { match, at } = readingMatch(roundIndex, 6);
        expect(match).toMatchObject({
          phase: 'round_reading',
          roundIndex,
          phaseStartedAt: at,
          phaseDeadlineAt: at + seconds * 1000,
        });
      }
      expect(defaultGameTiming.readingMs(20)).toBe(60_000);
    });

    it('R36: confirmar marca o jogador como pronto; confirmar de novo não muda nada', () => {
      const { match } = readingMatch();
      const once = run(match, [ready('ana')]).match;

      expect(once?.round?.ready).toEqual(new Set(['ana']));
      expect(run(once, [ready('ana')]).match?.round?.ready).toEqual(new Set(['ana']));
    });

    it('R37, R38: todos os conectados confirmam → o desenho começa no mesmo instante para todos', () => {
      const { match } = readingMatch();
      const now = T0 + 9000;
      const result = run(
        match,
        players.map((p) => ready(p)),
        now,
      );

      expect(result.match).toMatchObject({
        phase: 'round_drawing',
        roundIndex: 1,
        phaseStartedAt: now,
        phaseDeadlineAt: now + DRAWING_MS,
      });
      expect(result.effects).toEqual([{ type: 'schedule_phase', at: now + DRAWING_MS }]);
    });

    it('R37: desconectado conta como pronto e não segura a fase', () => {
      const { match } = readingMatch();
      const withoutCaio = new Set(['ana', 'bia']);

      expect(
        run(match, [ready('ana', 1, withoutCaio), ready('bia', 1, withoutCaio)]).match?.phase,
      ).toBe('round_drawing');

      const waiting = run(match, [ready('ana'), ready('bia')]).match;
      expect(waiting?.phase).toBe('round_reading');
      const afterDrop = run(waiting, [{ type: 'presence_changed', connected: withoutCaio }]);
      expect(afterDrop.match?.phase).toBe('round_drawing');
    });

    it('R37: o prazo da leitura confirma quem faltou', () => {
      const { match } = readingMatch();
      const readingDeadline = present(match).phaseDeadlineAt ?? 0;
      const confirmed = run(match, [ready('ana')], readingDeadline - 1).match;
      const { match: drawing } = run(confirmed, [deadline], readingDeadline);

      expect(drawing?.phase).toBe('round_drawing');
      expect(drawing?.round?.ready).toEqual(everyone);
      expect(errorCode(() => run(match, [ready('bia')], readingDeadline))).toBe('DEADLINE_PASSED');
    });

    it('R37: mudança de presença fora da leitura não muda nada', () => {
      const drawing = drawingMatch();
      expect(run(drawing, [{ type: 'presence_changed', connected: new Set() }])).toEqual({
        match: drawing,
        effects: [],
      });
    });
  });

  describe('desenho', () => {
    it('R39: guarda só o último autosave de cada jogador', () => {
      const { match } = run(drawingMatch(), [autosave('ana', 1), autosave('ana', 2)]);

      expect(match?.round?.drafts.get('ana')).toEqual(png(2));
    });

    it('R39, R61: autosave depois do prazo do desenho → DEADLINE_PASSED', () => {
      expect(errorCode(() => run(drawingMatch(), [autosave('ana', 1)], DRAWING_DEADLINE))).toBe(
        'DEADLINE_PASSED',
      );
    });

    it('R40/R44: envio repetido, rodada errada e fora da fase → erros corretos', () => {
      const drawing = drawingMatch();
      const afterDone = run(drawing, [done('ana', 1)]).match;
      expect(errorCode(() => run(afterDone, [done('ana', 2)]))).toBe('INVALID_STATE');
      expect(errorCode(() => run(afterDone, [timeout('ana', 2)]))).toBe('INVALID_STATE');
      expect(errorCode(() => run(afterDone, [autosave('ana', 2)]))).toBe('INVALID_STATE');
      expect(errorCode(() => run(drawing, [done('bia', 1, 1)]))).toBe('INVALID_STATE');
      expect(errorCode(() => run(started(), [done('bia', 1)]))).toBe('INVALID_STATE');

      const { match: reading } = readingMatch();
      expect(errorCode(() => run(reading, [done('bia', 1, 1)]))).toBe('INVALID_STATE');
      expect(errorCode(() => run(reading, [done('bia', 1, 0)]))).toBe('DEADLINE_PASSED');
    });

    it('R42, R61: o envio vale até o fim da janela de fechamento, nunca depois', () => {
      const drawing = drawingMatch();
      expect(
        run(
          drawing,
          [timeout('ana', 1)],
          DRAWING_DEADLINE + CLOSING_MS - 1,
        ).match?.round?.finals.has('ana'),
      ).toBe(true);
      expect(
        errorCode(() => run(drawing, [timeout('ana', 1)], DRAWING_DEADLINE + CLOSING_MS)),
      ).toBe('DEADLINE_PASSED');

      const closing = closingMatch();
      const closingDeadline = present(closing).phaseDeadlineAt ?? 0;
      expect(errorCode(() => run(closing, [timeout('caio', 3)], closingDeadline))).toBe(
        'DEADLINE_PASSED',
      );
    });

    it('R41: todos concluíram → a rodada fecha antes do prazo', () => {
      const now = T0 + 7000;
      const { match, effects } = run(
        drawingMatch(),
        [done('ana', 1), done('bia', 2), done('caio', 3)],
        now,
      );

      expect(match).toMatchObject({ phase: 'round_reading', roundIndex: 1, phaseStartedAt: now });
      expect(effects.map((e) => e.type)).toEqual(['persist_round', 'schedule_phase']);
    });

    it('R41: com alguém sem concluir (mesmo desconectado), o desenho espera o prazo', () => {
      const { match, effects } = run(drawingMatch(), [done('ana', 1), done('bia', 2)]);

      expect(match?.phase).toBe('round_drawing');
      expect(effects).toEqual([]);
    });

    it('R42: no prazo do desenho, a partida entra no fechamento e pede os quadros', () => {
      const drawing = run(drawingMatch(), [done('ana', 1)]).match;
      const { match, effects } = run(drawing, [deadline], DRAWING_DEADLINE);

      expect(match).toMatchObject({
        phase: 'round_closing',
        roundIndex: 0,
        phaseDeadlineAt: DRAWING_DEADLINE + CLOSING_MS,
      });
      expect(effects).toEqual([
        { type: 'schedule_phase', at: DRAWING_DEADLINE + CLOSING_MS },
        { type: 'emit_collect', roundIndex: 0 },
      ]);
    });

    it('R42: o último quadro que chega no fechamento encerra a rodada', () => {
      const { match, effects } = run(closingMatch(), [timeout('caio', 3)], DRAWING_DEADLINE + 1);

      expect(match?.phase).toBe('round_reading');
      expect(persisted(effects).map((p) => p.status)).toEqual(['complete', 'partial', 'complete']);
    });
  });

  describe('fechamento', () => {
    it('R42/R43: final > autosave > vazio, com status complete, partial e empty', () => {
      // Round 0 (R31): bia draws ana's story, caio draws bia's, ana draws caio's.
      const { match, effects } = run(
        drawingMatch(),
        [done('ana', 1), autosave('bia', 2), autosave('caio', 3), done('caio', null)],
        T0 + 2,
      );
      const closing = run(match, [deadline], DRAWING_DEADLINE).match;
      expect(effects).toEqual([]);
      const result = run(closing, [deadline], DRAWING_DEADLINE + CLOSING_MS);

      expect(persisted(result.effects)).toEqual([
        {
          id: 'panel-0-ana',
          storyId: 'story-ana',
          position: 0,
          artistPlayerId: 'bia',
          artistNickname: 'BIA',
          status: 'partial',
          png: png(2),
        },
        {
          id: 'panel-0-bia',
          storyId: 'story-bia',
          position: 0,
          artistPlayerId: 'caio',
          artistNickname: 'CAIO',
          status: 'empty',
          png: null,
        },
        {
          id: 'panel-0-caio',
          storyId: 'story-caio',
          position: 0,
          artistPlayerId: 'ana',
          artistNickname: 'ANA',
          status: 'complete',
          png: png(1),
        },
      ]);
      expect(result.match?.stories.map((s) => s.panels)).toEqual([
        [{ id: 'panel-0-ana', position: 0, artistPlayerId: 'bia', status: 'partial' }],
        [{ id: 'panel-0-bia', position: 0, artistPlayerId: 'caio', status: 'empty' }],
        [{ id: 'panel-0-caio', position: 0, artistPlayerId: 'ana', status: 'complete' }],
      ]);
    });

    it('R43: envio por timeout com imagem é partial; sem nada, empty', () => {
      const closing = run(drawingMatch(), [timeout('ana', 1)]).match;
      const { effects } = run(
        run(closing, [deadline], DRAWING_DEADLINE).match,
        [deadline],
        DRAWING_DEADLINE + CLOSING_MS,
      );

      expect(persisted(effects).map((p) => [p.artistPlayerId, p.status])).toEqual([
        ['bia', 'empty'],
        ['caio', 'empty'],
        ['ana', 'partial'],
      ]);
    });

    it('os rascunhos da rodada são descartados quando ela termina', () => {
      const drawing = run(drawingMatch(), [autosave('ana', 1)]).match;
      const closing = run(drawing, [deadline], DRAWING_DEADLINE).match;
      const { match } = run(closing, [deadline], DRAWING_DEADLINE + CLOSING_MS);

      expect(match).toMatchObject({ phase: 'round_reading', roundIndex: 1 });
      expect(match?.round?.drafts.size).toBe(0);
      expect(match?.round?.finals.size).toBe(0);
    });

    it('R45: depois da última rodada, a partida vai para a apresentação', () => {
      const { match: last } = readingMatch(2);
      const drawing = run(
        last,
        players.map((p) => ready(p, 2)),
        T0 + 9000,
      ).match;
      const { match, effects } = run(
        drawing,
        players.map((p) => done(p, 7, 2)),
        T0 + 9500,
      );

      expect(match).toMatchObject({
        phase: 'presentation',
        roundIndex: 2,
        phaseDeadlineAt: null,
        round: null,
        presentation: {
          status: 'showing',
          storyIndex: 0,
          step: { kind: 'theme' },
          maxStoryReached: 0,
          revealedCount: [0, 0, 0],
        },
      });
      expect(match?.stories.map((s) => s.panels.map((p) => p.position))).toEqual([
        [0, 1, 2],
        [0, 1, 2],
        [0, 1, 2],
      ]);
      expect(effects.map((e) => e.type)).toEqual([
        'persist_round',
        'cancel_phase',
        'set_match_status',
      ]);
      expect(effects).toContainEqual({
        type: 'set_match_status',
        matchId: 'match-1',
        status: 'presenting',
      });
    });
  });

  describe('apresentação', () => {
    it('R52, R53: o anfitrião move o cursor sem efeitos colaterais', () => {
      const presenting = readingMatch(3).match;
      const { match, effects } = run(presenting, [
        nextStep,
        { type: 'presentation_navigate', action: { action: 'nextStory' } },
      ]);

      expect(match?.presentation).toEqual({
        status: 'showing',
        storyIndex: 1,
        step: { kind: 'theme' },
        maxStoryReached: 1,
        revealedCount: [3, 0, 0],
      });
      expect(match?.phase).toBe('presentation');
      expect(effects).toEqual([]);
    });

    it('R52: goToStory além de maxStoryReached → INVALID_STATE', () => {
      const presenting = readingMatch(3).match;
      const goTo = (storyIndex: number): MatchEvent => ({
        type: 'presentation_navigate',
        action: { action: 'goToStory', storyIndex },
      });

      expect(errorCode(() => run(presenting, [goTo(1)]))).toBe('INVALID_STATE');
      expect(errorCode(() => run(presenting, [goTo(0)]))).toBeUndefined();
    });

    it('R56: encerrar volta ao lobby e marca a partida como finished, sem apagar nada', () => {
      const presenting = readingMatch(3).match;

      expect(run(presenting, [nextStep, endPresentation])).toEqual({
        match: null,
        effects: [{ type: 'set_match_status', matchId: 'match-1', status: 'finished' }],
      });
    });
  });

  it('R57: abortar em qualquer fase volta ao lobby, avisa e apaga a partida', () => {
    for (const match of [started(), drawingMatch(), readingMatch().match, closingMatch()]) {
      expect(run(match, [{ type: 'abort', reason: 'persistence_failed' }])).toEqual({
        match: null,
        effects: [
          { type: 'cancel_phase' },
          { type: 'notify_aborted', reason: 'persistence_failed' },
          { type: 'delete_match', matchId: 'match-1' },
        ],
      });
    }
  });
});
