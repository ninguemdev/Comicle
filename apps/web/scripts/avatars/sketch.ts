import { ART_SIZE, BRUSH, INK, type Box, type Point } from './layout';

// Hand-drawn look of skribbl.io: one round brush of constant width, a slight hand tremor, flat
// fills, and closed outlines that run a little past their start, like a loop drawn with a mouse.

/** Maximum drift of a stroke from its ideal path. */
const WOBBLE_AMPLITUDE = 2.4;
/** Small shapes tremble less, or a freckle would turn into a blot. */
const WOBBLE_PER_PERIMETER = 1 / 60;
/** Distance between two random tremor values along a stroke. */
const WOBBLE_WAVELENGTH = 48;
/** Spacing of the points of every stroke after resampling. */
const SAMPLE_STEP = 10;
/** How far a closed outline continues past its start, as a fraction of its length. */
const OVERSHOOT = 0.06;

export const PLACEHOLDER_MARKER = 'comicle-placeholder';

export type Mark =
  | { kind: 'fill'; points: Point[]; color: string }
  | { kind: 'stroke'; points: Point[]; width: number; color: string };

export interface StrokeStyle {
  width?: number;
  color?: string;
}

export interface ShapeStyle {
  fill?: string;
  /** `false` draws the fill alone (dots, blush). */
  stroke?: StrokeStyle | false;
}

/** FNV-1a: turns the art ID into a seed, so each art always trembles the same way. */
function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast and deterministic; quality is irrelevant for a tremor. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

function pointAt(points: readonly Point[], index: number): Point {
  const point = points[index];
  if (!point) {
    throw new RangeError(`Ponto ${String(index)} fora do traço`);
  }
  return point;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function perimeter(points: readonly Point[], closed: boolean): number {
  let total = 0;
  const segments = closed ? points.length : points.length - 1;
  for (let index = 0; index < segments; index++) {
    total += distance(pointAt(points, index), pointAt(points, (index + 1) % points.length));
  }
  return total;
}

/** Evenly spaced points along the polyline (corners round off by at most half a step). */
function resample(points: readonly Point[], closed: boolean): Point[] {
  const path = closed ? [...points, pointAt(points, 0)] : [...points];
  const total = perimeter(path, false);
  const count = Math.max(closed ? 8 : 2, Math.round(total / SAMPLE_STEP));
  const step = total / count;
  const result: Point[] = [pointAt(path, 0)];
  let segment = 0;
  let walked = 0;
  for (let index = 1; index < (closed ? count : count + 1); index++) {
    const target = index * step;
    let start = pointAt(path, segment);
    let end = pointAt(path, Math.min(segment + 1, path.length - 1));
    while (walked + distance(start, end) < target && segment < path.length - 2) {
      walked += distance(start, end);
      segment += 1;
      start = pointAt(path, segment);
      end = pointAt(path, segment + 1);
    }
    const length = distance(start, end);
    const t = length === 0 ? 0 : Math.min(1, (target - walked) / length);
    result.push({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
  }
  return result;
}

/** Cosine interpolation between random values: a smooth drift instead of jitter. */
function smoothNoise(values: readonly number[], position: number): number {
  const index = Math.floor(position);
  const blend = (1 - Math.cos((position - index) * Math.PI)) / 2;
  const from = values[index] ?? 0;
  const to = values[index + 1] ?? from;
  return from + (to - from) * blend;
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function round(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function formatPoint(point: Point): string {
  return `${round(point.x)},${round(point.y)}`;
}

/** Catmull-Rom through every point, written as cubic Béziers. */
function pathData(points: readonly Point[], closed: boolean): string {
  const count = points.length;
  const at = (index: number) =>
    pointAt(points, closed ? (index + count) % count : Math.min(Math.max(index, 0), count - 1));
  let data = `M${formatPoint(at(0))}`;
  for (let index = 0; index < (closed ? count : count - 1); index++) {
    const [before, from, to, after] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
    const control1 = { x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6 };
    const control2 = { x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6 };
    data += `C${formatPoint(control1)} ${formatPoint(control2)} ${formatPoint(to)}`;
  }
  return closed ? `${data}Z` : data;
}

/** Records hand-drawn marks in painting order and writes them as an SVG. */
export class Sketch {
  readonly marks: Mark[] = [];
  private readonly random: () => number;

  constructor(seed: string) {
    this.random = createRandom(hashSeed(seed));
  }

  /**
   * Closed shape: flat fill, then whatever `inside` draws over the fill, then the outline on
   * top, so inner details never cover the outline.
   */
  shape(ring: readonly Point[], style: ShapeStyle = {}, inside?: () => void): this {
    const base = resample(ring, true);
    const start = Math.floor(this.random() * base.length);
    const rotated = rotate(base, start);
    const lap = [...rotated, ...rotated.slice(0, Math.ceil(rotated.length * OVERSHOOT) + 1)];
    const wobbled = this.wobble(lap, perimeter(base, true));
    if (style.fill !== undefined) {
      this.marks.push({
        kind: 'fill',
        points: wobbled.slice(0, rotated.length),
        color: style.fill,
      });
    }
    inside?.();
    if (style.stroke !== false) {
      this.marks.push({
        kind: 'stroke',
        points: wobbled,
        width: style.stroke?.width ?? BRUSH.thick,
        color: style.stroke?.color ?? INK,
      });
    }
    return this;
  }

  /** Filled shape without outline. */
  blob(ring: readonly Point[], color: string): this {
    return this.shape(ring, { fill: color, stroke: false });
  }

  /** Open stroke. */
  line(path: readonly Point[], style: StrokeStyle = {}): this {
    const points = resample(path, false);
    this.marks.push({
      kind: 'stroke',
      points: this.wobble(points, perimeter(points, false)),
      width: style.width ?? BRUSH.thick,
      color: style.color ?? INK,
    });
    return this;
  }

  /** Smallest box holding every mark, strokes counted with their width. */
  bounds(): Box {
    const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const mark of this.marks) {
      const reach = mark.kind === 'stroke' ? mark.width / 2 : 0;
      for (const { x, y } of mark.points) {
        box.left = Math.min(box.left, x - reach);
        box.top = Math.min(box.top, y - reach);
        box.right = Math.max(box.right, x + reach);
        box.bottom = Math.max(box.bottom, y + reach);
      }
    }
    return box;
  }

  toSvg(): string {
    const paths = this.marks.map((mark) =>
      mark.kind === 'fill'
        ? `<path fill="${mark.color}" d="${pathData(mark.points, true)}"/>`
        : `<path stroke="${mark.color}" stroke-width="${String(mark.width)}" d="${pathData(mark.points, false)}"/>`,
    );
    const size = String(ART_SIZE);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
      `<!-- ${PLACEHOLDER_MARKER}: arte provisória gerada por "pnpm avatars:generate". A arte definitiva substitui este arquivo (docs/avatares-guia-de-artes.md). -->`,
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round">',
      ...paths,
      '</g>',
      '</svg>',
      '',
    ].join('\n');
  }

  private wobble(points: readonly Point[], length: number): Point[] {
    const amplitude = Math.min(WOBBLE_AMPLITUDE, length * WOBBLE_PER_PERIMETER);
    const controls = Math.ceil(perimeter(points, false) / WOBBLE_WAVELENGTH) + 2;
    const drift = () => Array.from({ length: controls }, () => (this.random() * 2 - 1) * amplitude);
    const [driftX, driftY] = [drift(), drift()];
    let walked = 0;
    return points.map((point, index) => {
      if (index > 0) {
        walked += distance(pointAt(points, index - 1), point);
      }
      const position = walked / WOBBLE_WAVELENGTH;
      return {
        x: point.x + smoothNoise(driftX, position),
        y: point.y + smoothNoise(driftY, position),
      };
    });
  }
}
