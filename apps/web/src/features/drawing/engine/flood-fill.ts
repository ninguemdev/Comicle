import type { Point } from './drawing-document';

// The paint bucket (interface.md §4): fills the area around a point that has about the same
// color. Pure: works on RGBA pixels, so the renderer and the tests share it.

/** RGBA pixels, as a canvas `getImageData` returns them. */
export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * How far (per channel, 0–255) a pixel may be from the clicked one and still be filled. Strokes
 * are antialiased: without some slack, the fill would stop at the faint edge of every line.
 */
export const FILL_TOLERANCE = 48;

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

type Rgb = readonly [number, number, number];

function parseHex(color: string): Rgb | null {
  const match = HEX_COLOR.exec(color);
  if (!match) {
    return null;
  }
  return [
    Number.parseInt(match[1] ?? '', 16),
    Number.parseInt(match[2] ?? '', 16),
    Number.parseInt(match[3] ?? '', 16),
  ];
}

function channelDistance(data: Uint8ClampedArray, offset: number, rgb: Rgb): number {
  return Math.max(
    Math.abs((data[offset] ?? 0) - rgb[0]),
    Math.abs((data[offset + 1] ?? 0) - rgb[1]),
    Math.abs((data[offset + 2] ?? 0) - rgb[2]),
  );
}

/** Pixels reachable from the seed through similar colors, one scanline at a time. */
function regionMask(pixels: Pixels, seedX: number, seedY: number, target: Rgb): Uint8Array {
  const { data, width, height } = pixels;
  const mask = new Uint8Array(width * height);
  const similar = (index: number) =>
    mask[index] === 0 && channelDistance(data, index * 4, target) <= FILL_TOLERANCE;
  const stack = [seedY * width + seedX];
  for (let seed = stack.pop(); seed !== undefined; seed = stack.pop()) {
    if (!similar(seed)) {
      continue;
    }
    const y = Math.floor(seed / width);
    const rowStart = y * width;
    let left = seed;
    while (left > rowStart && similar(left - 1)) {
      left--;
    }
    let right = seed;
    while (right < rowStart + width - 1 && similar(right + 1)) {
      right++;
    }
    for (let index = left; index <= right; index++) {
      mask[index] = 1;
      if (y > 0 && similar(index - width)) {
        stack.push(index - width);
      }
      if (y < height - 1 && similar(index + width)) {
        stack.push(index + width);
      }
    }
  }
  return mask;
}

/** The region plus a 1 px rim, so the fill also covers the antialiased edge of the lines. */
function withRim(mask: Uint8Array, width: number, height: number): Uint8Array {
  const grown = mask.slice();
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] === 0) {
      continue;
    }
    const x = index % width;
    if (x > 0) {
      grown[index - 1] = 1;
    }
    if (x < width - 1) {
      grown[index + 1] = 1;
    }
    if (index >= width) {
      grown[index - width] = 1;
    }
    if (index < width * (height - 1)) {
      grown[index + width] = 1;
    }
  }
  return grown;
}

/**
 * Fills, in place, the area around `at` with `color` (`#RRGGBB`). Returns false and changes
 * nothing when the point is outside the pixels, the color is not a hex color, or the area
 * already has that color.
 */
export function floodFill(pixels: Pixels, at: Point, color: string): boolean {
  const fill = parseHex(color);
  const x = Math.floor(at.x);
  const y = Math.floor(at.y);
  if (!fill || x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }
  const { data, width, height } = pixels;
  const seedOffset = (y * width + x) * 4;
  const target: Rgb = [data[seedOffset] ?? 0, data[seedOffset + 1] ?? 0, data[seedOffset + 2] ?? 0];
  if (channelDistance(data, seedOffset, fill) === 0) {
    return false;
  }
  const mask = withRim(regionMask(pixels, x, y, target), width, height);
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] === 1) {
      const offset = index * 4;
      data[offset] = fill[0];
      data[offset + 1] = fill[1];
      data[offset + 2] = fill[2];
      data[offset + 3] = 255;
    }
  }
  return true;
}
