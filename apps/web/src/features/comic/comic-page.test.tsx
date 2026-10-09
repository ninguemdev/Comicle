import { defaultAvatar, type PanelRef, type PanelStatus } from '@comicle/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComicPage } from './comic-page';
import { PanelImageLoaderContext, type PanelImageLoader } from './use-panel-image';

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
  URL.createObjectURL = vi.fn((blob: Blob) => `blob:${String(blob.size)}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function panel(position: number, artist: string, status: PanelStatus = 'complete'): PanelRef {
  return {
    panelId: `panel-${String(position)}`,
    position,
    status,
    artist: { playerId: artist, nickname: artist, avatar: defaultAvatar() },
  };
}

/** Image of `n` bytes for panel n, so the blob URLs tell panels apart. */
const loader: PanelImageLoader = (panelId) =>
  Promise.resolve(new Blob([new Uint8Array(Number(panelId.split('-')[1]) + 1)]));

function renderPage(panels: PanelRef[], showCredits = false) {
  return render(
    <PanelImageLoaderContext value={loader}>
      <ComicPage panels={panels} showCredits={showCredits} />
    </PanelImageLoaderContext>,
  );
}

describe('ComicPage', () => {
  it('renderiza os quadros em ordem, com alt "Quadro {n} de {artista}"', async () => {
    // Out of order on purpose: the page follows `position`.
    renderPage([panel(2, 'Carla'), panel(0, 'Ana'), panel(1, 'Bruno')]);

    await waitFor(() => {
      expect(screen.getAllByRole('img').map((image) => image.getAttribute('src'))).toEqual([
        'blob:1',
        'blob:2',
        'blob:3',
      ]);
    });
    expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
      'Quadro 1 de Ana',
      'Quadro 2 de Bruno',
      'Quadro 3 de Carla',
    ]);
  });

  it('R55: quadro empty mostra o texto e não busca imagem', () => {
    const spy = vi.fn(loader);
    render(
      <PanelImageLoaderContext value={spy}>
        <ComicPage panels={[panel(0, 'Diego', 'empty')]} />
      </PanelImageLoaderContext>,
    );

    expect(screen.getByText('Diego não desenhou a tempo')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Quadro 1 de Diego' })).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('créditos aparecem só quando pedidos', async () => {
    const { unmount } = renderPage([panel(0, 'Elisa')]);
    await screen.findByRole('img', { name: 'Quadro 1 de Elisa' });
    expect(screen.queryByText('Elisa')).toBeNull();
    unmount();

    renderPage([panel(0, 'Elisa')], true);
    expect(screen.getByText('Elisa')).toBeTruthy();
  });

  it('quadro que não carrega avisa, sem quebrar a página', async () => {
    render(
      <PanelImageLoaderContext value={() => Promise.reject(new Error('403'))}>
        <ComicPage panels={[panel(0, 'Ana')]} />
      </PanelImageLoaderContext>,
    );

    expect(await screen.findByText('Não deu para carregar este quadro.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Quadro 1 de Ana' })).toBeTruthy();
  });
});
