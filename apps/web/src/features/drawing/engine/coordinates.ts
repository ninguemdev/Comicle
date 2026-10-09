import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';

import type { Point } from './drawing-document';

// Screen ↔ logical panel space (interface.md §4, Superfície): whatever the screen, a drawing is
// always PANEL_WIDTH × PANEL_HEIGHT.

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** The part of DOMRect the conversion needs. */
export interface ScreenRect extends Size {
  readonly left: number;
  readonly top: number;
}

/** Largest panel-shaped (4:3) size, in whole CSS pixels, that fits in `container`. */
export function fitPanel(container: Size): Size {
  const width = Math.max(
    0,
    Math.min(container.width, (container.height * PANEL_WIDTH) / PANEL_HEIGHT),
  );
  return {
    width: Math.floor(width),
    height: Math.floor((width * PANEL_HEIGHT) / PANEL_WIDTH),
  };
}

/** Pixels of the canvas buffer for a CSS size, so strokes stay sharp on dense screens. */
export function bufferSize(css: Size, devicePixelRatio: number): Size {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    width: Math.max(1, Math.round(css.width * ratio)),
    height: Math.max(1, Math.round(css.height * ratio)),
  };
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/** A pointer position on screen, in the logical space of the panel, clamped to its edges. */
export function toLogical(clientX: number, clientY: number, rect: ScreenRect): Point {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(((clientX - rect.left) / rect.width) * PANEL_WIDTH, PANEL_WIDTH),
    y: clamp(((clientY - rect.top) / rect.height) * PANEL_HEIGHT, PANEL_HEIGHT),
  };
}
