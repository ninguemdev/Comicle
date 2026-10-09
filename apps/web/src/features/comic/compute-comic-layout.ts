import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';

// Comic page composition (interface.md §3). Pure: the page component measures, these decide.

export type MaxColumns = 1 | 2 | 3;

/** Below this container width, one panel per row. */
const ONE_COLUMN_BELOW = 480;
/** Up to this container width, two panels per row; wider, three. */
const TWO_COLUMNS_UP_TO = 1024;
/** Four panels always make a 2×2 grid (unless only one column fits). */
const SQUARE_GRID_PANELS = 4;
/** Below this panel width the page stops shrinking and scrolls instead. */
export const MIN_PANEL_WIDTH = 160;

/**
 * Panels per row: `ceil(n / maxColumns)` rows, as even as possible, the fuller rows first.
 * `computeComicLayout(5, 2)` → `[2, 2, 1]`.
 */
export function computeComicLayout(panelCount: number, maxColumns: MaxColumns): number[] {
  if (panelCount <= 0) {
    return [];
  }
  const rows = Math.ceil(panelCount / maxColumns);
  const base = Math.floor(panelCount / rows);
  const extra = panelCount % rows;
  return Array.from({ length: rows }, (_, row) => (row < extra ? base + 1 : base));
}

/** `items` cut into rows of the given sizes, in reading order. */
export function splitIntoRows<T>(items: readonly T[], rows: readonly number[]): T[][] {
  return rows.map((count, index) => {
    const start = rows.slice(0, index).reduce((sum, size) => sum + size, 0);
    return items.slice(start, start + count);
  });
}

/** How many columns a page this wide may use for `panelCount` panels. */
export function columnsForWidth(width: number, panelCount: number): MaxColumns {
  if (width < ONE_COLUMN_BELOW) {
    return 1;
  }
  if (width <= TWO_COLUMNS_UP_TO || panelCount === SQUARE_GRID_PANELS) {
    return 2;
  }
  return 3;
}

export interface PageArea {
  width: number;
  height: number;
}

export interface PanelSizing {
  /** Space between panels, horizontally and vertically. */
  gutter: number;
  /** Height taken under each panel by its credit line (0 without credits). */
  captionHeight: number;
}

/**
 * Width of every panel (all the same, 4:3): the largest that fits the whole page in `area`. If
 * that falls below MIN_PANEL_WIDTH, panels keep that minimum (or the row width, if smaller) and
 * the page scrolls vertically.
 */
export function panelWidthFor(
  area: PageArea,
  rows: readonly number[],
  sizing: PanelSizing,
): number {
  const columns = Math.max(0, ...rows);
  if (columns === 0) {
    return 0;
  }
  const byWidth = (area.width - (columns - 1) * sizing.gutter) / columns;
  const rowHeight = (area.height - (rows.length - 1) * sizing.gutter) / rows.length;
  const byHeight = ((rowHeight - sizing.captionHeight) * PANEL_WIDTH) / PANEL_HEIGHT;
  const fitting = Math.min(byWidth, byHeight);
  const width = fitting >= MIN_PANEL_WIDTH ? fitting : Math.min(byWidth, MIN_PANEL_WIDTH);
  return Math.max(0, Math.floor(width));
}
