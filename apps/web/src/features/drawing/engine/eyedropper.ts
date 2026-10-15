import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';

import type { Point } from './drawing-document';
import { BACKGROUND_COLOR } from './palette';

// The eyedropper (interface.md §4): the color of one pixel of the drawing. Pure, like the bucket.

const MAX_CHANNEL = 255;
const BACKGROUND_RGB = [1, 3, 5].map((start) =>
  Number.parseInt(BACKGROUND_COLOR.slice(start, start + 2), 16),
);

/** The pixel under a logical point; a point on the far edge belongs to the last pixel. */
export function pixelUnder(at: Point): Point {
  return {
    x: Math.min(Math.floor(at.x), PANEL_WIDTH - 1),
    y: Math.min(Math.floor(at.y), PANEL_HEIGHT - 1),
  };
}

/**
 * One RGBA pixel as `#RRGGBB`, the format of the palette. The layer is opaque once painted, but a
 * transparent pixel would still read as the background it ends up on.
 */
export function pickedColor(rgba: ArrayLike<number>): string {
  const alpha = (rgba[3] ?? MAX_CHANNEL) / MAX_CHANNEL;
  return `#${[0, 1, 2]
    .map((channel) => {
      const value = (rgba[channel] ?? 0) * alpha + (BACKGROUND_RGB[channel] ?? 0) * (1 - alpha);
      return Math.round(value).toString(16).padStart(2, '0');
    })
    .join('')
    .toUpperCase()}`;
}
