// Colors and brush sizes of the drawing editor (interface.md §4). The avatar arts use the same
// palette (scripts/avatars/layout.ts), so a player can redraw any of them.

/** The 16 fixed colors, by id; their names live in strings/pt-BR.ts. */
export const DRAWING_COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  gray: '#7F7F7F',
  silver: '#C3C3C3',
  red: '#E53935',
  orange: '#FB8C00',
  yellow: '#FDD835',
  green: '#43A047',
  cyan: '#00ACC1',
  blue: '#1E88E5',
  indigo: '#3949AB',
  purple: '#8E24AA',
  pink: '#EC407A',
  brown: '#8D6E63',
  skin: '#F5CBA7',
  darkBrown: '#5D4037',
} as const;

export type DrawingColorId = keyof typeof DRAWING_COLORS;

/** Range of brush widths, in logical pixels (of the 1024×768 panel). */
export const BRUSH_SIZE_MIN = 2;
export const BRUSH_SIZE_MAX = 64;
export const DEFAULT_BRUSH_SIZE = 8;

/** `[` and `]` change the width by this share of it, so small sizes still take small steps. */
const BRUSH_SIZE_STEP_RATIO = 0.25;

/** Range of brush opacity; below the minimum a stroke would be hard to see at all. */
export const BRUSH_OPACITY_MIN = 0.1;
export const BRUSH_OPACITY_MAX = 1;
export const DEFAULT_BRUSH_OPACITY = 1;

export const DEFAULT_COLOR: string = DRAWING_COLORS.black;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** A whole width within the brush range. */
export function clampBrushSize(size: number): number {
  return clamp(Math.round(size), BRUSH_SIZE_MIN, BRUSH_SIZE_MAX);
}

/** The width one `[` (-1) or `]` (+1) away: about a quarter thinner or thicker, at least 1 px. */
export function stepBrushSize(size: number, direction: -1 | 1): number {
  const step = Math.max(1, Math.round(size * BRUSH_SIZE_STEP_RATIO));
  return clampBrushSize(size + direction * step);
}

export function clampBrushOpacity(opacity: number): number {
  return clamp(opacity, BRUSH_OPACITY_MIN, BRUSH_OPACITY_MAX);
}

/** The eraser paints the background: the exported PNG is opaque (interface.md §4). */
export const BACKGROUND_COLOR: string = DRAWING_COLORS.white;
