import type { Box, Point } from './layout';

// Ideal outlines as point lists. The sketch resamples and wobbles them, so these only need to
// describe the shape; a "ring" is closed (last point connects back to the first).

const FULL_TURN = Math.PI * 2;
const SMOOTH_SAMPLES = 96;

function degrees(angle: number): number {
  return (angle * Math.PI) / 180;
}

/** Samples `pointAt(t)` for t in [0, 1); closed rings skip t = 1 because it repeats t = 0. */
export function parametric(pointAt: (t: number) => Point, samples = SMOOTH_SAMPLES): Point[] {
  return Array.from({ length: samples }, (_, index) => pointAt(index / samples));
}

/** Ring starting at the top, clockwise. */
export function ellipse(center: Point, radiusX: number, radiusY: number): Point[] {
  return parametric((t) => ({
    x: center.x + radiusX * Math.sin(t * FULL_TURN),
    y: center.y - radiusY * Math.cos(t * FULL_TURN),
  }));
}

export function circle(center: Point, radius: number): Point[] {
  return ellipse(center, radius, radius);
}

/** Ring whose distance from the center varies with the angle (0 = top, clockwise). */
export function polar(center: Point, radiusAt: (angle: number) => number): Point[] {
  return parametric((t) => {
    const angle = t * FULL_TURN;
    const radius = radiusAt(angle);
    return { x: center.x + radius * Math.sin(angle), y: center.y - radius * Math.cos(angle) };
  }, SMOOTH_SAMPLES * 2);
}

/**
 * Open elliptical arc in degrees, y pointing down: 0° is right, 90° is bottom, 180° is left.
 * Goes from `from` to `to` in whichever direction their order says.
 */
export function arc(
  center: Point,
  radiusX: number,
  radiusY: number,
  from: number,
  to: number,
): Point[] {
  const samples = Math.max(8, Math.ceil(Math.abs(to - from) / 4));
  return Array.from({ length: samples + 1 }, (_, index) => {
    const angle = degrees(from + ((to - from) * index) / samples);
    return { x: center.x + radiusX * Math.cos(angle), y: center.y + radiusY * Math.sin(angle) };
  });
}

/** Ring with rounded corners. */
export function roundedRect(box: Box, radius: number): Point[] {
  const { left, top, right, bottom } = box;
  return [
    ...arc({ x: right - radius, y: top + radius }, radius, radius, 270, 360),
    ...arc({ x: right - radius, y: bottom - radius }, radius, radius, 0, 90),
    ...arc({ x: left + radius, y: bottom - radius }, radius, radius, 90, 180),
    ...arc({ x: left + radius, y: top + radius }, radius, radius, 180, 270),
  ];
}

export function quadratic(from: Point, control: Point, to: Point, samples = 24): Point[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = index / samples;
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    };
  });
}

/** Classic parametric heart, `size` wide, centered on `center`. */
export function heart(center: Point, size: number): Point[] {
  // The raw curve spans x ±16 and y from about -12 to 17; recenter and scale it.
  const scale = size / 32;
  return parametric((t) => {
    const angle = t * FULL_TURN;
    const x = 16 * Math.sin(angle) ** 3;
    const y = -(
      13 * Math.cos(angle) -
      5 * Math.cos(2 * angle) -
      2 * Math.cos(3 * angle) -
      Math.cos(4 * angle)
    );
    return { x: center.x + x * scale, y: center.y + (y - 2.5) * scale };
  });
}

/** Open spiral from the center outwards. */
export function spiral(center: Point, radius: number, turns: number): Point[] {
  const samples = Math.ceil(turns * 48);
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = index / samples;
    const angle = t * turns * FULL_TURN;
    return {
      x: center.x + radius * t * Math.cos(angle),
      y: center.y + radius * t * Math.sin(angle),
    };
  });
}

/** Mirror across the vertical axis x = `axis`. */
export function mirror(points: readonly Point[], axis: number): Point[] {
  return points.map((point) => ({ x: 2 * axis - point.x, y: point.y }));
}
