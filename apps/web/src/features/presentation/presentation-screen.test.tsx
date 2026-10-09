import {
  defaultAvatar,
  type ArtistRef,
  type PanelRef,
  type PanelStatus,
  type PresentationStep,
  type PresentationView,
} from '@comicle/shared';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoomStore } from '../../stores/room-store';
import { matchView, setUpStores } from '../../test/room-fixtures';
import { PanelImageLoaderContext, type PanelImageLoader } from '../comic/use-panel-image';
import { MatchScreen } from '../match/match-screen';
import { PresentationScreen } from './presentation-screen';

class NoopResizeObserver {
  observe(): void {
    // jsdom has no layout to observe
  }
  disconnect(): void {
    // nothing to stop
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  URL.createObjectURL = vi.fn(() => 'blob:quadro');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const loader: PanelImageLoader = () => Promise.resolve(new Blob([new Uint8Array(1)]));

const artist = (nickname: string): ArtistRef => ({
  playerId: nickname.toLowerCase(),
  nickname,
  avatar: defaultAvatar(),
});

function panel(position: number, nickname: string, status: PanelStatus = 'complete'): PanelRef {
  return { panelId: `panel-${String(position)}`, position, artist: artist(nickname), status };
}

const PANELS = [panel(0, 'Bia'), panel(1, 'Caio', 'empty'), panel(2, 'Ana')];

/** Story 1 of 3 ("Um gato prefeito", by Ana) at `step`, with `revealed` panels revealed. */
function presentation(
  step: PresentationStep,
  revealed = 0,
  overrides: Partial<PresentationView> = {},
): PresentationView {
  return {
    status: 'showing',
    storyIndex: 0,
    storyCount: 3,
    step,
    maxStoryReached: 1,
    story: {
      theme: { text: 'Um gato prefeito', author: artist('Ana') },
      panelCount: 3,
      revealedPanels: PANELS.slice(0, revealed),
    },
    reachedStories: [
      { index: 0, themeText: 'Um gato prefeito', author: artist('Ana') },
      { index: 1, themeText: 'A pizzaria da Lua', author: artist('Bia') },
    ],
    ...overrides,
  };
}

function renderScreen(view: PresentationView, isHost = true) {
  const actions = setUpStores(matchView({ phase: 'presentation', task: { kind: 'watch' } }));
  render(
    <PanelImageLoaderContext value={loader}>
      <PresentationScreen presentation={view} isHost={isHost} />
    </PanelImageLoaderContext>,
  );
  return actions;
}

describe('PresentationScreen: vistas', () => {
  it('R55: theme mostra o tema em destaque, o autor e "História X de Y"', () => {
    renderScreen(presentation({ kind: 'theme' }));

    expect(screen.getByRole('heading', { name: 'História 1 de 3' })).toBeTruthy();
    expect(screen.getByText('Um gato prefeito')).toBeTruthy();
    expect(screen.getByText('Tema de Ana')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Página de HQ' })).toBeNull();
  });

  it('panel(k) mostra o quadro k com o artista e a faixa dos já revelados', async () => {
    renderScreen(presentation({ kind: 'panel', position: 2 }, 3));

    const page = screen.getByRole('group', { name: 'Página de HQ' });
    await waitFor(() => {
      expect(within(page).getByRole('img', { name: 'Quadro 3 de Ana' })).toBeTruthy();
    });
    expect(within(page).getByText('Ana')).toBeTruthy();
    const strip = screen.getByRole('list', { name: 'Quadros já revelados' });
    const thumbnails = within(strip).getAllByRole('listitem');
    expect(thumbnails).toHaveLength(3);
    expect(thumbnails.map((item) => item.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'step',
    ]);
  });

  it('R55: quadro vazio aparece com "{nickname} não desenhou a tempo"', () => {
    renderScreen(presentation({ kind: 'panel', position: 1 }, 2));

    const page = screen.getByRole('group', { name: 'Página de HQ' });
    expect(within(page).getByRole('img', { name: 'Quadro 2 de Caio' }).textContent).toBe(
      'Caio não desenhou a tempo',
    );
    // The thumbnail is too small for the text; it keeps the accessible name.
    const strip = screen.getByRole('list', { name: 'Quadros já revelados' });
    expect(within(strip).getByRole('img', { name: 'Quadro 2 de Caio' }).textContent).toBe('');
  });

  it('full mostra a HQ completa com créditos de todos os quadros', async () => {
    renderScreen(presentation({ kind: 'full' }, 3));

    expect(screen.getByText('HQ completa')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Um gato prefeito' })).toBeTruthy();
    const page = screen.getByRole('group', { name: 'Página de HQ' });
    await waitFor(() => {
      expect(within(page).getAllByRole('img')).toHaveLength(3);
    });
    expect(
      within(page)
        .getAllByRole('figure')
        .map((figure) => figure.textContent),
    ).toEqual(['1Bia', 'Caio não desenhou a tempo2Caio', '3Ana']);
    expect(screen.queryByRole('list', { name: 'Quadros já revelados' })).toBeNull();
  });

  it('R56: finished leva o anfitrião ao lobby com Nova partida', () => {
    const actions = renderScreen(presentation({ kind: 'full' }, 3, { status: 'finished' }));

    expect(screen.getByRole('heading', { name: 'Fim das histórias!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Nova partida' }));

    expect(actions.endPresentation).toHaveBeenCalledTimes(1);
  });

  it('finished, para os demais, só avisa que o anfitrião vai voltar ao lobby', () => {
    renderScreen(presentation({ kind: 'full' }, 3, { status: 'finished' }), false);

    expect(screen.getByRole('heading', { name: 'Fim das histórias!' })).toBeTruthy();
    expect(screen.getByText('O anfitrião vai levar todo mundo de volta ao lobby.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nova partida' })).toBeNull();
  });
});

describe('PresentationScreen: controles', () => {
  it('só o anfitrião vê os controles; os demais veem quem conduz', () => {
    renderScreen(presentation({ kind: 'theme' }), false);

    expect(screen.queryByRole('navigation', { name: 'Controles da apresentação' })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('O anfitrião está conduzindo')).toBeTruthy();
  });

  it('R52: os botões do anfitrião emitem as ações do cursor', () => {
    const actions = renderScreen(presentation({ kind: 'panel', position: 0 }, 1));
    const bar = screen.getByRole('navigation', { name: 'Controles da apresentação' });

    expect(screen.queryByText('O anfitrião está conduzindo')).toBeNull();
    for (const name of ['Voltar', 'Avançar', 'Ver HQ completa', 'Próxima história']) {
      fireEvent.click(within(bar).getByRole('button', { name }));
    }

    expect(actions.navigatePresentation.mock.calls).toEqual([
      [{ action: 'prev' }],
      [{ action: 'next' }],
      [{ action: 'showFull' }],
      [{ action: 'nextStory' }],
    ]);
  });

  it('R52: o que não moveria o cursor fica desabilitado', () => {
    renderScreen(presentation({ kind: 'theme' }));
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveProperty('disabled', true);
  });

  it('R52: em finished, só voltar, Histórias e Encerrar seguem ativos', () => {
    renderScreen(presentation({ kind: 'full' }, 3, { status: 'finished' }));
    const bar = screen.getByRole('navigation', { name: 'Controles da apresentação' });

    const enabled = within(bar)
      .getAllByRole('button')
      .filter((button) => !(button as HTMLButtonElement).disabled)
      .map((button) => button.textContent);
    expect(enabled).toEqual(['Voltar', 'Histórias', 'Encerrar']);
  });

  it('atalhos de teclado do anfitrião: → e Espaço avançam, ← volta, F mostra a HQ completa', () => {
    const actions = renderScreen(presentation({ kind: 'panel', position: 0 }, 1));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'f' });
    fireEvent.keyDown(window, { key: 'F' });
    // Not shortcuts: other keys, modifiers and auto-repeat.
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
    fireEvent.keyDown(window, { key: 'x' });

    expect(actions.navigatePresentation.mock.calls).toEqual([
      [{ action: 'next' }],
      [{ action: 'next' }],
      [{ action: 'prev' }],
      [{ action: 'showFull' }],
      [{ action: 'showFull' }],
    ]);
  });

  it('Espaço num botão focado só aciona o botão', () => {
    const actions = renderScreen(presentation({ kind: 'panel', position: 0 }, 1));

    fireEvent.keyDown(screen.getByRole('button', { name: 'Voltar' }), { key: ' ' });

    expect(actions.navigatePresentation).not.toHaveBeenCalled();
  });

  it('T18: sem conexão, controles e atalhos do anfitrião esperam a conexão', () => {
    const actions = renderScreen(presentation({ kind: 'panel', position: 0 }, 1));
    act(() => {
      useRoomStore.setState({ connection: 'reconnecting' });
    });

    const bar = screen.getByRole('navigation', { name: 'Controles da apresentação' });
    expect(
      within(bar)
        .getAllByRole('button')
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(actions.navigatePresentation).not.toHaveBeenCalled();
  });

  it('os demais não têm atalhos', () => {
    const actions = renderScreen(presentation({ kind: 'theme' }), false);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'f' });

    expect(actions.navigatePresentation).not.toHaveBeenCalled();
  });

  it('R52: o menu Histórias lista só reachedStories e emite goToStory', () => {
    const actions = renderScreen(presentation({ kind: 'theme' }));

    fireEvent.click(screen.getByRole('button', { name: 'Histórias' }));
    const dialog = screen.getByRole('dialog', { name: 'Histórias já apresentadas' });
    const items = within(dialog)
      .getAllByRole('button')
      .map((button) => button.textContent)
      .filter((text) => text !== '');
    expect(items).toEqual(['1. Um gato prefeito', '2. A pizzaria da Lua']);
    // Shortcuts wait while the menu is open.
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    fireEvent.click(within(dialog).getByRole('button', { name: '2. A pizzaria da Lua' }));

    expect(actions.navigatePresentation.mock.calls).toEqual([
      [{ action: 'goToStory', storyIndex: 1 }],
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('R56: Encerrar pede confirmação antes de voltar ao lobby', () => {
    const actions = renderScreen(presentation({ kind: 'theme' }));

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Encerrar a apresentação?' });
    expect(actions.endPresentation).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encerrar' }));

    expect(actions.endPresentation).toHaveBeenCalledTimes(1);
  });
});

describe('MatchScreen na apresentação', () => {
  it('mostra a apresentação, sem o Encerrar partida que apagaria tudo (R57)', () => {
    const view = matchView({
      phase: 'presentation',
      roundIndex: 2,
      phaseDeadlineAt: null,
      task: { kind: 'watch' },
      presentation: presentation({ kind: 'theme' }),
    });
    setUpStores(view);
    render(<MatchScreen view={view} match={view.match ?? never()} />);

    expect(screen.getByRole('heading', { name: 'História 1 de 3' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Controles da apresentação' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Encerrar partida' })).toBeNull();
  });
});

function never(): never {
  throw new Error('view sem partida');
}
