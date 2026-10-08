import type { Box, Point } from './layout';

// Tiny antialiased rasterizer for the PNG template: rectangles, ellipses and dashed lines.
// Shapes take art units (512) and are scaled to the raster size.

export interface Paint {
  color: string;
  opacity?: number;
}

export interface Pen extends Paint {
  width: number;
  /** Length of each dash and gap; solid when absent. */
  dash?: number;
}

function parseHex(color: string): [number, number, number] {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isDashGap(along: number, dash: number | undefined): boolean {
  return dash !== undefined && Math.floor(along / dash) % 2 === 1;
}

export class Raster {
  readonly pixels: Uint8Array;
  private readonly scale: number;

  constructor(
    readonly size: number,
    artSize: number,
  ) {
    this.pixels = new Uint8Array(size * size * 4);
    this.scale = size / artSize;
  }

  fillRect(box: Box, paint: Paint): void {
    this.cover(box, paint, (x, y) =>
      Math.max(box.left - x, x - box.right, box.top - y, y - box.bottom),
    );
  }

  strokeRect(box: Box, pen: Pen): void {
    const { left, top, right, bottom } = box;
    this.strokeLine({ x: left, y: top }, { x: right, y: top }, pen);
    this.strokeLine({ x: right, y: top }, { x: right, y: bottom }, pen);
    this.strokeLine({ x: right, y: bottom }, { x: left, y: bottom }, pen);
    this.strokeLine({ x: left, y: bottom }, { x: left, y: top }, pen);
  }

  strokeLine(from: Point, to: Point, pen: Pen): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const reach = pen.width / 2 + 1;
    const bounds = {
      left: Math.min(from.x, to.x) - reach,
      top: Math.min(from.y, to.y) - reach,
      right: Math.max(from.x, to.x) + reach,
      bottom: Math.max(from.y, to.y) + reach,
    };
    this.cover(bounds, pen, (x, y) => {
      const t = clamp01(((x - from.x) * dx + (y - from.y) * dy) / lengthSquared);
      if (isDashGap(t * Math.sqrt(lengthSquared), pen.dash)) {
        return Infinity;
      }
      return Math.hypot(x - (from.x + t * dx), y - (from.y + t * dy)) - pen.width / 2;
    });
  }

  fillEllipse(center: Point, radiusX: number, radiusY: number, paint: Paint): void {
    this.cover(this.ellipseBounds(center, radiusX, radiusY, 1), paint, (x, y) =>
      this.ellipseDistance(center, radiusX, radiusY, x, y),
    );
  }

  strokeEllipse(center: Point, radiusX: number, radiusY: number, pen: Pen): void {
    const bounds = this.ellipseBounds(center, radiusX, radiusY, pen.width / 2 + 1);
    this.cover(bounds, pen, (x, y) => {
      const angle = Math.atan2(y - center.y, x - center.x) + Math.PI;
      if (isDashGap((angle * (radiusX + radiusY)) / 2, pen.dash)) {
        return Infinity;
      }
      return Math.abs(this.ellipseDistance(center, radiusX, radiusY, x, y)) - pen.width / 2;
    });
  }

  private ellipseBounds(center: Point, radiusX: number, radiusY: number, reach: number): Box {
    return {
      left: center.x - radiusX - reach,
      top: center.y - radiusY - reach,
      right: center.x + radiusX + reach,
      bottom: center.y + radiusY + reach,
    };
  }

  /** Radial approximation of the signed distance; exact for circles, close enough for guides. */
  private ellipseDistance(
    center: Point,
    radiusX: number,
    radiusY: number,
    x: number,
    y: number,
  ): number {
    const dx = x - center.x;
    const dy = y - center.y;
    const normalized = Math.hypot(dx / radiusX, dy / radiusY);
    if (normalized === 0) {
      return -Math.min(radiusX, radiusY);
    }
    return (Math.hypot(dx, dy) * (normalized - 1)) / normalized;
  }

  /** Blends `paint` over every pixel whose center lies inside (`distance` ≤ 0, in art units). */
  private cover(bounds: Box, paint: Paint, distance: (x: number, y: number) => number): void {
    const [red, green, blue] = parseHex(paint.color);
    const opacity = paint.opacity ?? 1;
    const fromX = Math.max(0, Math.floor(bounds.left * this.scale));
    const toX = Math.min(this.size, Math.ceil(bounds.right * this.scale));
    const fromY = Math.max(0, Math.floor(bounds.top * this.scale));
    const toY = Math.min(this.size, Math.ceil(bounds.bottom * this.scale));
    for (let py = fromY; py < toY; py++) {
      for (let px = fromX; px < toX; px++) {
        const signed = distance((px + 0.5) / this.scale, (py + 0.5) / this.scale) * this.scale;
        const alpha = clamp01(0.5 - signed) * opacity;
        if (alpha > 0) {
          this.blend((py * this.size + px) * 4, red, green, blue, alpha);
        }
      }
    }
  }

  /** Source-over with straight alpha. */
  private blend(index: number, red: number, green: number, blue: number, alpha: number): void {
    const pixels = this.pixels;
    const below = (pixels[index + 3] ?? 0) / 255;
    const total = alpha + below * (1 - alpha);
    const mix = (source: number, channel: number) =>
      Math.round((source * alpha + (pixels[index + channel] ?? 0) * below * (1 - alpha)) / total);
    pixels[index] = mix(red, 0);
    pixels[index + 1] = mix(green, 1);
    pixels[index + 2] = mix(blue, 2);
    pixels[index + 3] = Math.round(total * 255);
  }
}
