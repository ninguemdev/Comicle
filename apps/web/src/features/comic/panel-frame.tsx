import type { PanelRef } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';
import { usePanelImage } from './use-panel-image';

const texts = strings.comic;

/** Credit line under a panel, in px; ComicPage reserves it when sizing the panels. */
export const PANEL_CAPTION_HEIGHT = 24;

/** Halftone dots of a panel without a picture (empty, loading or failed). */
const HALFTONE =
  'bg-paper bg-[radial-gradient(color-mix(in_oklab,var(--color-ink)_12%,transparent)_1px,transparent_1.5px)] bg-size-[10px_10px]';

export interface PanelFrameProps {
  panel: PanelRef;
  /** Width in CSS px; the height follows at 4:3. */
  width: number;
  /** R55: the artist's nickname under the panel. */
  showCredit?: boolean;
}

function Placeholder({ label, text }: { label: string; text: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex size-full items-center justify-center p-3 text-center font-bold text-muted ${HALFTONE}`}
    >
      <span aria-hidden="true">{text}</span>
    </div>
  );
}

function PanelImage({ panel, alt }: { panel: PanelRef; alt: string }) {
  const image = usePanelImage(panel.panelId);
  switch (image.status) {
    case 'ready':
      return <img src={image.url} alt={alt} className="size-full object-cover" draggable={false} />;
    case 'loading':
      return <Placeholder label={alt} text={texts.loading} />;
    case 'error':
      return <Placeholder label={alt} text={texts.loadFailed} />;
    default:
      return image satisfies never;
  }
}

/** One panel of a comic page: the drawing, its number and, optionally, who drew it. */
export function PanelFrame({ panel, width, showCredit = false }: PanelFrameProps) {
  const number = panel.position + 1;
  const { nickname } = panel.artist;
  const alt = texts.panelAlt(number, nickname);
  return (
    <figure className="m-0 flex shrink-0 flex-col" style={{ width }}>
      <div className="relative aspect-[4/3] w-full overflow-hidden border-comic bg-paper">
        {panel.status === 'empty' ? (
          // R55: an empty panel says whose it was.
          <Placeholder label={alt} text={texts.notDrawn(nickname)} />
        ) : (
          <PanelImage panel={panel} alt={alt} />
        )}
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-pop-yellow font-display text-sm leading-none"
        >
          {number}
        </span>
      </div>
      {showCredit && (
        <figcaption
          className="truncate text-center text-sm text-muted"
          style={{ height: PANEL_CAPTION_HEIGHT, lineHeight: `${String(PANEL_CAPTION_HEIGHT)}px` }}
        >
          {nickname}
        </figcaption>
      )}
    </figure>
  );
}
