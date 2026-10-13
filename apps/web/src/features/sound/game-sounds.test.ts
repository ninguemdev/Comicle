import {
  defaultAvatar,
  type MatchView,
  type PlayerTask,
  type PresentationStep,
  type PresentationView,
} from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { lobbyView, matchView, member } from '../../test/room-fixtures';
import { soundsForChange } from './game-sounds';

const draw = (status: 'drawing' | 'submitted'): PlayerTask => ({
  kind: 'draw_panel',
  status,
  theme: 'Um gato',
  panelPosition: 1,
  panelCount: 1,
  draftPanels: [],
  deadlineAt: 200_000,
  previousPanels: [],
});
const read: PlayerTask = {
  kind: 'read_story',
  status: 'reading',
  theme: 'Um gato',
  previousPanels: [],
};

function round(phase: MatchView['phase'], roundIndex: number, task: PlayerTask) {
  return matchView({ phase, roundIndex, task });
}

function presentation(
  step: PresentationStep,
  { storyIndex = 0, status = 'showing' }: Partial<PresentationView> = {},
): PresentationView {
  const author = { playerId: 'p1', nickname: 'Ana', avatar: defaultAvatar() };
  return {
    status,
    storyIndex,
    storyCount: 3,
    step,
    maxStoryReached: storyIndex,
    story: { theme: { text: 'Um gato', author }, panelCount: 3, revealedPanels: [] },
    reachedStories: [],
    version: null,
  };
}

function presenting(view: PresentationView) {
  return matchView({ phase: 'presentation', task: { kind: 'watch' }, presentation: view });
}

describe('soundsForChange', () => {
  it('a primeira view da sala (chegar, recarregar, reconectar) não toca nada', () => {
    expect(soundsForChange(null, lobbyView())).toEqual([]);
    expect(soundsForChange(null, round('round_drawing', 1, draw('drawing')))).toEqual([]);
  });

  it('a mesma view de novo, como numa reconexão, não toca nada', () => {
    const view = round('round_drawing', 1, draw('drawing'));
    expect(soundsForChange(view, structuredClone(view))).toEqual([]);
  });

  it('no lobby, alguém entrar ou sair toca join ou leave', () => {
    const two = lobbyView();
    const three = lobbyView({ members: [...two.room.members, member('p3', 'Caio')] });

    expect(soundsForChange(two, three)).toEqual(['join']);
    expect(soundsForChange(three, two)).toEqual(['leave']);
  });

  it('R22, R26: a partida começa com start, sem um turn em cima', () => {
    expect(soundsForChange(lobbyView(), matchView())).toEqual(['start']);
  });

  it('R27, R40: tema e quadro recebidos tocam submit', () => {
    const writing = matchView();
    const submitted = matchView({ task: { kind: 'write_theme', status: 'submitted', draft: 'x' } });
    expect(soundsForChange(writing, submitted)).toEqual(['submit']);

    expect(
      soundsForChange(
        round('round_drawing', 1, draw('drawing')),
        round('round_drawing', 1, draw('submitted')),
      ),
    ).toEqual(['submit']);
  });

  it('R34, R35: uma rodada nova (desenho ou leitura) toca turn', () => {
    const themesDone = matchView({
      task: { kind: 'write_theme', status: 'submitted', draft: 'x' },
    });
    expect(soundsForChange(themesDone, round('round_drawing', 0, draw('drawing')))).toEqual([
      'turn',
    ]);

    const waiting = round('round_closing', 0, { kind: 'wait' });
    expect(soundsForChange(waiting, round('round_reading', 1, read))).toEqual(['turn']);
  });

  it('R36: confirmar a própria leitura não toca turn; a leitura acabar pelo prazo, sim', () => {
    const reading = round('round_reading', 1, read);

    expect(soundsForChange(reading, round('round_reading', 1, draw('drawing')))).toEqual([]);
    expect(soundsForChange(reading, round('round_drawing', 1, draw('drawing')))).toEqual(['turn']);
    // Already drawing when the others finish reading: the phase changes, the task does not.
    expect(
      soundsForChange(
        round('round_reading', 1, draw('drawing')),
        round('round_drawing', 1, draw('drawing')),
      ),
    ).toEqual([]);
  });

  it('R51–R53: cada passo novo da apresentação toca reveal; a HQ completa, fanfare', () => {
    const closing = round('round_closing', 2, { kind: 'wait' });
    const theme = presenting(presentation({ kind: 'theme' }));
    const panel = presenting(presentation({ kind: 'panel', position: 0 }));
    const full = presenting(presentation({ kind: 'full' }));
    const finished = presenting(presentation({ kind: 'full' }, { status: 'finished' }));

    expect(soundsForChange(closing, theme)).toEqual(['reveal']);
    expect(soundsForChange(theme, panel)).toEqual(['reveal']);
    expect(soundsForChange(panel, full)).toEqual(['fanfare']);
    expect(soundsForChange(full, full)).toEqual([]);
    expect(soundsForChange(full, finished)).toEqual([]);
  });

  it('outra sala ou fim da partida: nada', () => {
    const other = { ...lobbyView(), room: { ...lobbyView().room, code: 'ZZZZZZ' } };
    expect(soundsForChange(lobbyView(), other)).toEqual([]);
    expect(soundsForChange(presenting(presentation({ kind: 'full' })), lobbyView())).toEqual([]);
  });
});
