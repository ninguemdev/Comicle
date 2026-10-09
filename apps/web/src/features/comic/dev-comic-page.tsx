import { PANEL_HEIGHT, PANEL_WIDTH, defaultAvatar, type PanelRef } from '@comicle/shared';
import { useId, useState } from 'react';

import { strings } from '../../strings/pt-BR';
import { DRAWING_COLORS } from '../drawing/engine/palette';
import { ComicPage } from './comic-page';
import { PanelImageLoaderContext, type PanelImageLoader } from './use-panel-image';

const texts = strings.devComic;
const MAX_PANELS = 12;
const SAMPLE_COLORS = Object.values(DRAWING_COLORS).filter((color) => color !== '#FFFFFF');
/** Every third panel is empty when "Com quadros vazios" is on. */
const EMPTY_EVERY = 3;

/** A flat drawing with a big number, so the reading order is easy to check by eye. */
const sampleLoader: PanelImageLoader = (panelId) => {
  const position = Number(panelId.replace('sample-', ''));
  const canvas = new OffscreenCanvas(PANEL_WIDTH, PANEL_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Canvas 2D indisponível'));
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
  ctx.fillStyle = SAMPLE_COLORS[position % SAMPLE_COLORS.length] ?? '#000000';
  ctx.beginPath();
  ctx.arc(PANEL_WIDTH / 2, PANEL_HEIGHT / 2, PANEL_HEIGHT / 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 240px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(position + 1), PANEL_WIDTH / 2, PANEL_HEIGHT / 2);
  return canvas.convertToBlob({ type: 'image/png' });
};

function samplePanels(count: number, withEmpty: boolean): PanelRef[] {
  return Array.from({ length: count }, (_, position) => {
    const nickname = texts.artists[position % texts.artists.length] ?? '';
    return {
      panelId: `sample-${String(position)}`,
      position,
      status: withEmpty && position % EMPTY_EVERY === EMPTY_EVERY - 1 ? 'empty' : 'complete',
      artist: { playerId: nickname, nickname, avatar: defaultAvatar() },
    };
  });
}

/** Sample stories of 1 to 12 panels, routed only in development (`/dev/comic`). */
export function DevComicPage() {
  const countId = useId();
  const [count, setCount] = useState(5);
  const [credits, setCredits] = useState(false);
  const [withEmpty, setWithEmpty] = useState(false);

  return (
    // Full viewport width, past the app column, to try the three-column layout.
    <div className="relative left-1/2 flex w-screen -translate-x-1/2 flex-col gap-4 px-4">
      <header>
        <h1 className="font-display text-4xl tracking-wide">{texts.title}</h1>
        <p className="text-muted">{texts.intro}</p>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor={countId} className="flex items-center gap-2 font-bold">
          {texts.panelCount}
          <input
            id={countId}
            type="range"
            min={1}
            max={MAX_PANELS}
            value={count}
            onChange={(event) => {
              setCount(Number(event.target.value));
            }}
          />
          <span className="w-6 text-center">{count}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={credits}
            onChange={(event) => {
              setCredits(event.target.checked);
            }}
          />
          {texts.credits}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={withEmpty}
            onChange={(event) => {
              setWithEmpty(event.target.checked);
            }}
          />
          {texts.emptyPanels}
        </label>
      </div>
      <div className="h-[75dvh]">
        <PanelImageLoaderContext value={sampleLoader}>
          <ComicPage panels={samplePanels(count, withEmpty)} showCredits={credits} />
        </PanelImageLoaderContext>
      </div>
    </div>
  );
}
