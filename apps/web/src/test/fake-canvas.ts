import type { Layer, PaintContext } from '../features/drawing/engine/layers';

// A 2D context that records what is painted, so the drawing engine runs without a real canvas.

/** The editor only paints with plain colors; gradients and patterns show up as such. */
function styleName(style: string | CanvasGradient | CanvasPattern): string {
  return typeof style === 'string' ? style : 'pattern';
}

export class RecordingContext implements PaintContext {
  /** Identity of the canvas behind this context (what `drawImage` of a layer refers to). */
  readonly canvas: HTMLCanvasElement = document.createElement('canvas');
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  readonly calls: string[] = [];
  /** Every image drawn, in order. */
  readonly images: CanvasImageSource[] = [];

  beginPath(): void {
    this.calls.push('beginPath');
  }

  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo ${String(x)},${String(y)}`);
  }

  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo ${String(x)},${String(y)}`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.calls.push(`quad ${String(cpx)},${String(cpy)} ${String(x)},${String(y)}`);
  }

  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc ${String(x)},${String(y)} r${String(radius)}`);
  }

  fill(): void {
    this.calls.push(`fill ${styleName(this.fillStyle)}`);
  }

  stroke(): void {
    this.calls.push(`stroke ${styleName(this.strokeStyle)} w${String(this.lineWidth)}`);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(
      `fillRect ${styleName(this.fillStyle)} ${String(x)},${String(y)},${String(width)},${String(height)}`,
    );
  }

  drawImage(image: CanvasImageSource): void {
    this.images.push(image);
    this.calls.push('drawImage');
  }
}

/** A layer over a RecordingContext whose PNG is the given bytes. */
export function recordingLayer(png = new Uint8Array([1, 2, 3])): Layer & { ctx: RecordingContext } {
  return { ctx: new RecordingContext(), toPng: () => Promise.resolve(png) };
}
