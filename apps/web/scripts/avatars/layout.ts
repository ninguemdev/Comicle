import type { AvatarCategory } from '@comicle/shared';

import { DRAWING_COLORS } from '../../src/features/drawing/engine/palette';

// Standard frame of every avatar art. docs/avatares-guia-de-artes.md repeats these numbers for
// the artist; change both together.

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Side of the square SVG viewBox; every layer uses the same frame. */
export const ART_SIZE = 512;
/** Side of a raster layer: twice the viewBox, so it stays sharp on dense screens. */
export const PNG_ART_SIZE = 1024;
/** Nothing is drawn closer than this to the edges, strokes included. */
export const SAFE_MARGIN = 16;
/** Upper bound of one art file, so the editor loads every option quickly. */
export const MAX_ART_BYTES = 100 * 1024;

/** One round brush in three sizes, like the skribbl.io brush. */
export const BRUSH = {
  /** Silhouettes (head, hats) and single-line features (mouth line, closed eyes, brows). */
  thick: 16,
  /** Outlines of small filled shapes (eye whites, teeth, lenses) and frames. */
  medium: 12,
  /** Tiny details (shine, seams, chains); they disappear at 32 px, by design. */
  thin: 8,
} as const;

/** Outline color: the ink of the interface. */
export const INK = '#16161D';

/** Fill colors: the 16 fixed colors of the drawing editor (interface.md §4). */
export const PALETTE = DRAWING_COLORS;

/** Where the features sit, so any eyes, mouth or cheeks fit any head. */
export const ANCHORS = {
  faceCenter: { x: 256, y: 280 },
  /** Top of every head outline; hats rest on it. */
  crownY: 120,
  /** Hats that cover the top of the head reach down to this line. */
  hatBaseY: 180,
  leftEye: { x: 196, y: 250 },
  rightEye: { x: 316, y: 250 },
  /** Each eye fits in a circle of this radius around its center. */
  eyeRadius: 44,
  mouth: { x: 256, y: 350 },
  leftCheek: { x: 166, y: 322 },
  rightCheek: { x: 346, y: 322 },
  /** Each cheek fits in a circle of this radius around its center. */
  cheekRadius: 34,
} as const;

/** The round head; the template shows it and every other head roughly follows it. */
export const REFERENCE_HEAD = { center: { x: 256, y: 284 }, radius: 164 } as const;

/** Area every head must cover (fill, not outline): eyes, cheeks and mouth fall inside it. */
export const FACE_AREA = { center: { x: 256, y: 300 }, radiusX: 132, radiusY: 108 } as const;

/** Bounding box each layer may use, strokes included. */
export const ZONES: Record<AvatarCategory, Box> = {
  head: { left: 80, top: 104, right: 432, bottom: 476 },
  cheeks: { left: 126, top: 282, right: 386, bottom: 362 },
  eyes: { left: 144, top: 196, right: 368, bottom: 304 },
  mouth: { left: 166, top: 300, right: 346, bottom: 410 },
  faceAccessory: { left: 86, top: 170, right: 426, bottom: 420 },
  hat: { left: SAFE_MARGIN, top: SAFE_MARGIN, right: ART_SIZE - SAFE_MARGIN, bottom: 220 },
};
