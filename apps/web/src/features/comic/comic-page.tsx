import type { PanelRef } from '@comicle/shared';
import { useEffect, useRef, useState } from 'react';

import { strings } from '../../strings/pt-BR';
import {
  columnsForWidth,
  computeComicLayout,
  panelWidthFor,
  type MaxColumns,
  splitIntoRows,
  type PageArea,
} from './compute-comic-layout';
import { PANEL_CAPTION_HEIGHT, PanelFrame } from './panel-frame';

export interface ComicPageProps {
  panels: readonly PanelRef[];
  /** R55: the artist under each panel (presentation, full view). */
  showCredits?: boolean;
  /** Overrides the columns chosen from the width (interface.md §3). */
  maxColumns?: MaxColumns;
}

interface Measured {
  /** Space for the panels inside the paper frame. */
  area: PageArea;
  /** `--gutter-comic` (interface.md §1), read from the stylesheet. */
  gutter: number;
}

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The page fills its parent; the paper frame's padding and border are not space for panels. */
function measure(container: HTMLElement, frame: HTMLElement): Measured {
  const style = getComputedStyle(frame);
  const horizontal =
    px(style.paddingLeft) +
    px(style.paddingRight) +
    px(style.borderLeftWidth) +
    px(style.borderRightWidth);
  const vertical =
    px(style.paddingTop) +
    px(style.paddingBottom) +
    px(style.borderTopWidth) +
    px(style.borderBottomWidth);
  return {
    area: {
      width: Math.max(0, container.clientWidth - horizontal),
      height: Math.max(0, container.clientHeight - vertical),
    },
    gutter: px(style.getPropertyValue('--gutter-comic')),
  };
}

function sameMeasure(a: Measured, b: Measured): boolean {
  return a.area.width === b.area.width && a.area.height === b.area.height && a.gutter === b.gutter;
}

/**
 * A story as a comic page (interface.md §3): equal 4:3 panels in rows, read left to right and
 * top to bottom, incomplete rows centered, as large as fits in the visible area. Below the
 * minimum panel size, the page scrolls instead of shrinking further.
 */
export function ComicPage({ panels, showCredits = false, maxColumns }: ComicPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured>({ area: { width: 0, height: 0 }, gutter: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const frame = frameRef.current;
    if (!container || !frame) {
      return;
    }
    const update = () => {
      const next = measure(container, frame);
      setMeasured((current) => (sameMeasure(current, next) ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  const ordered = [...panels].sort((a, b) => a.position - b.position);
  const columns = maxColumns ?? columnsForWidth(measured.area.width, ordered.length);
  const rows = computeComicLayout(ordered.length, columns);
  const panelWidth = panelWidthFor(measured.area, rows, {
    gutter: measured.gutter,
    captionHeight: showCredits ? PANEL_CAPTION_HEIGHT : 0,
  });

  const rowsOfPanels = splitIntoRows(ordered, rows);

  return (
    <div ref={containerRef} className="size-full min-h-0 overflow-y-auto">
      <div
        ref={frameRef}
        aria-label={strings.comic.page}
        role="group"
        className="mx-auto flex w-fit flex-col gap-(--gutter-comic) rounded-xl border-comic bg-paper p-3 shadow-pop sm:p-4"
      >
        {rowsOfPanels.map((row) => (
          <div
            key={row[0]?.panelId ?? 'empty'}
            className="flex justify-center gap-(--gutter-comic)"
          >
            {row.map((panel) => (
              <PanelFrame
                key={panel.panelId}
                panel={panel}
                width={panelWidth}
                showCredit={showCredits}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
