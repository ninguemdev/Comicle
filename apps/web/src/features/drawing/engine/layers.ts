import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';

// Off-screen canvases of panel size. The only engine file that touches the DOM; everything else
// receives a `Layer` (tests pass fakes).

/** The part of a 2D context the editor uses; real canvas contexts satisfy it. */
export interface PaintContext {
  readonly canvas: CanvasImageSource;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
}

export interface Layer {
  readonly ctx: PaintContext;
  /** PNG bytes of what is on the layer. */
  toPng(): Promise<Uint8Array>;
}

export type CreateLayer = () => Layer;

async function blobBytes(blob: Blob | null): Promise<Uint8Array> {
  if (blob === null) {
    throw new Error('O navegador não gerou o PNG do quadro');
  }
  return new Uint8Array(await blob.arrayBuffer());
}

function offscreenLayer(): Layer | null {
  if (typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  const canvas = new OffscreenCanvas(PANEL_WIDTH, PANEL_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return null;
  }
  return { ctx, toPng: () => canvas.convertToBlob({ type: 'image/png' }).then(blobBytes) };
}

function elementLayer(): Layer | null {
  const canvas = document.createElement('canvas');
  canvas.width = PANEL_WIDTH;
  canvas.height = PANEL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return null;
  }
  return {
    ctx,
    toPng: () =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      }).then(blobBytes),
  };
}

/** A PANEL_WIDTH × PANEL_HEIGHT canvas, off-screen where the browser supports it. */
export const createPanelLayer: CreateLayer = () => {
  const layer = offscreenLayer() ?? elementLayer();
  if (layer === null) {
    throw new Error('Canvas 2D indisponível neste navegador');
  }
  return layer;
};
