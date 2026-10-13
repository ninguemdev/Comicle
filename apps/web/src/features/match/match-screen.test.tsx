import type { MatchPhase, PlayerTask } from '@comicle/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { matchView, setUpStores } from '../../test/room-fixtures';
import { MatchScreen, screenFor, type MatchScreenId } from './match-screen';

const read: PlayerTask = {
  kind: 'read_story',
  status: 'reading',
  theme: 'Tema',
  previousPanels: [],
};
const draw = (status: 'drawing' | 'submitted'): PlayerTask => ({
  kind: 'draw_panel',
  status,
  theme: 'Tema',
  panelPosition: 1,
  hasDraft: false,
  deadlineAt: 100_000,
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('screenFor', () => {
  it.each<[MatchPhase, PlayerTask, MatchScreenId]>([
    ['theme_writing', { kind: 'write_theme', status: 'writing', draft: '' }, 'theme'],
    ['theme_writing', { kind: 'write_theme', status: 'submitted', draft: 'x' }, 'waiting'],
    ['theme_writing', { kind: 'spectate' }, 'spectator'],
    ['round_reading', read, 'reading'],
    // R36: who confirmed the reading is already drawing.
    ['round_reading', draw('drawing'), 'drawing'],
    ['round_reading', draw('submitted'), 'waiting'],
    ['round_reading', { kind: 'spectate' }, 'spectator'],
    ['round_drawing', draw('drawing'), 'drawing'],
    ['round_drawing', draw('submitted'), 'waiting'],
    ['round_drawing', { kind: 'wait' }, 'waiting'],
    ['round_closing', { kind: 'wait' }, 'transition'],
    ['round_closing', { kind: 'spectate' }, 'spectator'],
    ['presentation', { kind: 'watch' }, 'presentation'],
  ])('%s + %o → %s', (phase, task, expected) => {
    expect(screenFor(matchView({ phase, task }).match ?? never())).toBe(expected);
  });
});

describe('MatchScreen', () => {
  it('R57: o anfitrião encerra a partida depois de confirmar', () => {
    const view = matchView({ phase: 'round_drawing', roundIndex: 1, task: draw('submitted') });
    const actions = setUpStores(view);
    render(<MatchScreen view={view} match={view.match ?? never()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar partida' }));
    const dialog = screen.getByRole('dialog', { name: 'Encerrar a partida?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encerrar' }));

    expect(actions.abortMatch).toHaveBeenCalledTimes(1);
  });

  it('só o anfitrião vê Encerrar partida', () => {
    const view = matchView(
      { phase: 'round_drawing', roundIndex: 1, task: draw('submitted') },
      'p2',
    );
    setUpStores(view);
    render(<MatchScreen view={view} match={view.match ?? never()} />);

    expect(screen.queryByRole('button', { name: 'Encerrar partida' })).toBeNull();
  });
});

function never(): never {
  throw new Error('view sem partida');
}
