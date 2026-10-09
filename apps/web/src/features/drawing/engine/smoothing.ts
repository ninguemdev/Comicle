import type { Point } from './drawing-document';

// Stroke smoothing with quadratic curves through midpoints (interface.md §4): each sampled point
// becomes a control point, so corners between samples turn into curves.

export type PathSegment =
  | { readonly kind: 'move'; readonly to: Point }
  | { readonly kind: 'quad'; readonly control: Point; readonly to: Point }
  | { readonly kind: 'line'; readonly to: Point }
  /** A single tap: a round dot of the brush size. */
  | { readonly kind: 'dot'; readonly at: Point };

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function smoothPath(points: readonly Point[]): PathSegment[] {
  const [first, ...rest] = points;
  if (first === undefined) {
    return [];
  }
  const last = rest.at(-1);
  if (last === undefined) {
    return [{ kind: 'dot', at: first }];
  }
  const segments: PathSegment[] = [{ kind: 'move', to: first }];
  for (let i = 1; i < points.length - 1; i++) {
    const control = points[i];
    const next = points[i + 1];
    if (control && next) {
      segments.push({ kind: 'quad', control, to: midpoint(control, next) });
    }
  }
  segments.push({ kind: 'line', to: last });
  return segments;
}
