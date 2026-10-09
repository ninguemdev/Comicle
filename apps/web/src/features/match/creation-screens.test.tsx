import { defaultAvatar, THEME_DRAFT_DEBOUNCE_MS, type PlayerView } from '@comicle/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { matchView, setUpStores } from '../../test/room-fixtures';
import { MatchScreen } from './match-screen';

class NoopResizeObserver {
  observe(): void {
    // jsdom has no layout to observe
  }
  disconnect(): void {
    // nothing to stop
  }
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderMatch(view: PlayerView) {
  const match = view.match;
  if (!match) {
    throw new Error('view sem partida');
  }
  return render(<MatchScreen view={view} match={match} />);
}

describe('tela de temas', () => {
  it('R28: a digitação gera um único theme:draft depois do debounce', () => {
    vi.useFakeTimers();
    const actions = setUpStores(matchView());
    renderMatch(matchView());
    const field = screen.getByRole('textbox', { name: 'Seu tema' });

    for (const text of ['U', 'Um', 'Um gato', 'Um gato no telhado']) {
      fireEvent.change(field, { target: { value: text } });
      act(() => {
        vi.advanceTimersByTime(THEME_DRAFT_DEBOUNCE_MS / 2);
      });
    }
    expect(actions.draftTheme).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(THEME_DRAFT_DEBOUNCE_MS);
    });
    expect(actions.draftTheme).toHaveBeenCalledTimes(1);
    expect(actions.draftTheme).toHaveBeenCalledWith('Um gato no telhado');
  });

  it('R49: o rascunho salvo volta no campo e não é reenviado', () => {
    vi.useFakeTimers();
    const view = matchView({ task: { kind: 'write_theme', status: 'writing', draft: 'Salvo' } });
    const actions = setUpStores(view);
    renderMatch(view);

    expect(screen.getByRole('textbox', { name: 'Seu tema' })).toHaveProperty('value', 'Salvo');
    act(() => {
      vi.advanceTimersByTime(THEME_DRAFT_DEBOUNCE_MS * 2);
    });
    expect(actions.draftTheme).not.toHaveBeenCalled();
  });

  it('R27: Pronto só com 3 a 140 caracteres', () => {
    setUpStores(matchView());
    renderMatch(matchView());
    const field = screen.getByRole('textbox', { name: 'Seu tema' });
    const ready = () => screen.getByRole('button', { name: 'Pronto' });

    expect(ready()).toHaveProperty('disabled', true);
    fireEvent.change(field, { target: { value: '  oi  ' } });
    expect(ready()).toHaveProperty('disabled', true);
    fireEvent.change(field, { target: { value: 'x'.repeat(141) } });
    expect(ready()).toHaveProperty('disabled', true);
    fireEvent.change(field, { target: { value: 'Um gato' } });
    expect(ready()).toHaveProperty('disabled', false);
  });

  it('Pronto envia theme:submit; com a view de enviado, aparece a espera', async () => {
    const actions = setUpStores(matchView());
    const { rerender } = renderMatch(matchView());

    fireEvent.change(screen.getByRole('textbox', { name: 'Seu tema' }), {
      target: { value: 'Um gato no telhado' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pronto' }));
      await Promise.resolve();
    });
    expect(actions.submitTheme).toHaveBeenCalledWith('Um gato no telhado');

    const submitted = matchView({
      task: { kind: 'write_theme', status: 'submitted', draft: 'Um gato no telhado' },
      progress: { done: 1, total: 3 },
    });
    rerender(<MatchScreen view={submitted} match={submitted.match ?? never()} />);
    expect(screen.getByText('Recebido!')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('leitura', () => {
  const previousPanels = [
    {
      panelId: 'quadro-0',
      position: 0,
      status: 'complete' as const,
      artist: { playerId: 'p2', nickname: 'Bia', avatar: defaultAvatar() },
    },
  ];

  it('R36: Começar a desenhar envia round:ready da rodada', async () => {
    const view = matchView({
      phase: 'round_reading',
      roundIndex: 1,
      task: { kind: 'read_story', status: 'reading', theme: 'Um gato', previousPanels },
    });
    const actions = setUpStores(view);
    renderMatch(view);

    expect(screen.getByRole('img', { name: 'Quadro 1 de Bia' })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Começar a desenhar' }));
      await Promise.resolve();
    });
    expect(actions.confirmReading).toHaveBeenCalledWith(1);
  });

  it('R36: com status ready nenhum quadro é renderizado', () => {
    const view = matchView({
      phase: 'round_reading',
      roundIndex: 1,
      task: { kind: 'read_story', status: 'ready', theme: 'Um gato' },
    });
    setUpStores(view);
    renderMatch(view);

    expect(screen.getByText('Um gato')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Quadro/ })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Página de HQ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Começar a desenhar' })).toBeNull();
  });
});

function never(): never {
  throw new Error('view sem partida');
}
