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

/** Brush widths in logical pixels (of the 1024×768 panel). */
export const BRUSH_SIZES = [3, 8, 16, 32] as const;

export type BrushSize = (typeof BRUSH_SIZES)[number];

export const DEFAULT_COLOR: string = DRAWING_COLORS.black;
export const DEFAULT_BRUSH_SIZE: BrushSize = 8;

/** The eraser paints the background: the exported PNG is opaque (interface.md §4). */
export const BACKGROUND_COLOR: string = DRAWING_COLORS.white;
