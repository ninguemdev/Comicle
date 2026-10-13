import type { MatchSettings } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../../platform/errors';
import { playerForStory } from '../game-modes/game-mode';
import { individualMode } from '../game-modes/individual/individual-mode';
import type { NewPanel } from '../stories/story-repository';
import { defaultGameTiming } from '../timing/game-timing';
import { newMatchRecord, type Match } from './match';
import { createMatchMachine, type MatchEvent, type MatchTransition } from './match-machine';

// The individual mode (R62–R66) through the phase machine; the collaborative one is in
// match-machine.test.ts.

const T0 = 1_000_000;
const PANELS = 2;
const STORY_SECONDS = 180;
const STORY_MS = STORY_SECONDS * 1000;
const CLOSING_MS = defaultGameTiming.roundClosingMs;
const settings: MatchSettings = {
  mode: 'individual',
  panelCount: { kind: 'per_player' },
  drawingSeconds: 90,
  // Collaborative options: ignored here (R62).
  showPreviousPanels: true,
  authorDrawsLast: true,
  individual: { panelsPerStory: PANELS, storySeconds: STORY_SECONDS },
};
const players = ['ana', 'bia', 'caio'];
const rounds = individualMode.totalRounds(settings, players.length);
const plan = individualMode.buildPlan(players, rounds, settings);
const storyCount = individualMode.storyCount(players.length);
const png = (marker: number) => new Uint8Array([marker]);

const machine = createMatchMachine(defaultGameTiming);

function startEvent(): MatchEvent {
  return {
    type: 'start',
    id: 'match-1',
    settings,
    seats: players.map((playerId) => ({
      playerId,
      nickname: playerId.toUpperCase(),
      themeId: `theme-${playerId}`,
    })),
    totalRounds: rounds,
    plan,
    fallbackThemes: ['Reserva 1', 'Reserva 2', 'Reserva 3'],
    storyIds: Array.from({ length: storyCount }, (_, story) => `story-${String(story)}`),
    panelIds: Array.from({ length: rounds }, (_, round) =>
      Array.from({ length: storyCount }, (_unused, story) =>
        playerForStory(plan, round, story) === undefined
          ? []
          : Array.from({ length: PANELS }, (_x, k) => `panel-${String(story)}-${String(k)}`),
      ),
    ),
    previousMatchId: null,
  };
}

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

const autosave = (playerId: string, panelIndex: number, marker: number, roundIndex = 0) =>
  ({
    type: 'panel_autosave',
    playerId,
    roundIndex,
    panelIndex,
    png: png(marker),
  }) satisfies MatchEvent;
const done = (playerId: string, panelIndex: number, marker: number | null, roundIndex = 0) =>
  ({
    type: 'panel_submit',
    playerId,
    roundIndex,
    panelIndex,
    reason: 'done',
    png: marker === null ? null : png(marker),
  }) satisfies MatchEvent;

/** Every player in `who` hands in every panel of `roundIndex`. */
function handInAll(roundIndex: number, who = players): MatchEvent[] {
  return who.flatMap((playerId) =>
    Array.from({ length: PANELS }, (_, k) => done(playerId, k, 1, roundIndex)),
  );
}

/** Round 0 drawing, right after every theme was submitted at T0 + 1. */
function drawing(): Match {
  const themes = players.map((playerId): MatchEvent => ({
    type: 'theme_submit',
    playerId,
    text: `Tema de ${playerId}`,
  }));
  return present(run(machine.transition(null, startEvent(), T0).match, themes).match);
}

function persistedPanels(transition: MatchTransition): NewPanel[] {
  const effect = transition.effects.find((e) => e.type === 'persist_round');
  return effect?.type === 'persist_round' ? effect.panels : [];
}

describe('match machine no modo individual', () => {
  it('R65: os temas levam direto ao desenho, com o prazo da história inteira', () => {
    const match = drawing();
    expect(match.phase).toBe('round_drawing');
    expect(match.roundIndex).toBe(0);
    expect(match.phaseDeadlineAt).toBe(T0 + 1 + STORY_MS);
    expect(match.round?.drawingDeadlineAt).toBe(T0 + 1 + STORY_MS);
  });

  it('R64: uma história por versão, ordenada por tema e rodada', () => {
    const match = drawing();
    expect(match.stories.map((story) => story.id)).toEqual([
      'story-0',
      'story-1',
      'story-2',
      'story-3',
      'story-4',
      'story-5',
    ]);
    expect(match.stories.map((story) => story.authorPlayerId)).toEqual([
      'ana',
      'ana',
      'bia',
      'bia',
      'caio',
      'caio',
    ]);

    const record = newMatchRecord('room-1', match);
    expect(record.themes.map((theme) => [theme.id, theme.seat])).toEqual([
      ['theme-ana', 0],
      ['theme-bia', 1],
      ['theme-caio', 2],
    ]);
    expect(record.stories.map((story) => [story.themeId, story.position])).toEqual([
      ['theme-ana', 0],
      ['theme-ana', 1],
      ['theme-bia', 2],
      ['theme-bia', 3],
      ['theme-caio', 4],
      ['theme-caio', 5],
    ]);
  });

  it('R66: entregar um quadro não encerra a participação; entregar todos, sim', () => {
    const partial = run(drawing(), [done('ana', 0, 1)]);
    expect(partial.match?.phase).toBe('round_drawing');
    expect(partial.effects).toEqual([]);

    const last = run(present(partial.match), [
      done('ana', 1, 2),
      ...handInAll(
        0,
        players.filter((playerId) => playerId !== 'ana'),
      ),
    ]);
    // R41: everyone handed in everything, so the round ends without a closing window.
    expect(last.match?.roundIndex).toBe(1);
    expect(last.match?.phase).toBe('round_drawing');
    expect(persistedPanels(last)).toHaveLength(players.length * PANELS);
  });

  it('R66: um quadro entregue não aceita outro envio; quadro fora da história é recusado', () => {
    const match = present(run(drawing(), [done('ana', 0, 1)]).match);
    expect(errorCode(() => run(match, [done('ana', 0, 2)]))).toBe('INVALID_STATE');
    expect(errorCode(() => run(match, [autosave('ana', 0, 2)]))).toBe('INVALID_STATE');
    expect(errorCode(() => run(match, [autosave('ana', 1, 2)]))).toBeUndefined();
    expect(errorCode(() => run(match, [autosave('ana', PANELS, 2)]))).toBe('INVALID_PAYLOAD');
  });

  it('R42, R43, R66: o fechamento resolve cada quadro: envio final → autosave → vazio', () => {
    const drawn = run(drawing(), [done('ana', 0, 5), autosave('ana', 1, 6), autosave('bia', 1, 7)]);
    const closing = run(present(drawn.match), [{ type: 'phase_deadline' }], T0 + 1 + STORY_MS);
    expect(closing.match?.phase).toBe('round_closing');
    expect(closing.effects).toContainEqual({ type: 'emit_collect', roundIndex: 0 });

    const closed = run(
      present(closing.match),
      [{ type: 'phase_deadline' }],
      T0 + 1 + STORY_MS + CLOSING_MS,
    );
    const panels = persistedPanels(closed);
    const statusOf = (artist: string) =>
      panels.filter((p) => p.artistPlayerId === artist).map((p) => [p.position, p.status]);
    expect(statusOf('ana')).toEqual([
      [0, 'complete'],
      [1, 'partial'],
    ]);
    expect(statusOf('bia')).toEqual([
      [0, 'empty'],
      [1, 'partial'],
    ]);
    expect(statusOf('caio')).toEqual([
      [0, 'empty'],
      [1, 'empty'],
    ]);
    // R65: the next round has no reading either.
    expect(closed.match?.phase).toBe('round_drawing');
    expect(closed.match?.roundIndex).toBe(1);
  });

  it('R62, R63, R64: depois de N − 1 rodadas, cada versão tem os quadros de um artista que não é o autor', () => {
    const afterFirst = run(drawing(), handInAll(0));
    const presenting = run(present(afterFirst.match), handInAll(1));
    const match = present(presenting.match);

    expect(match.phase).toBe('presentation');
    expect(match.stories).toHaveLength(storyCount);
    for (const story of match.stories) {
      expect(story.panels.map((panel) => panel.position)).toEqual([0, 1]);
      const artists = new Set(story.panels.map((panel) => panel.artistPlayerId));
      expect(artists.size).toBe(1);
      expect(artists.has(story.authorPlayerId)).toBe(false);
    }
    // Each player drew one version of each theme but their own.
    for (const playerId of players) {
      const themes = match.stories
        .filter((story) => story.panels[0]?.artistPlayerId === playerId)
        .map((story) => story.authorPlayerId);
      expect(themes.sort()).toEqual(players.filter((p) => p !== playerId).sort());
    }
  });
});
