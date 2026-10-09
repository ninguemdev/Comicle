import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';

import type { DrawingDocument, DrawingOperation, NewStroke } from './drawing-document';
import type { CreateLayer, Layer, PaintContext } from './layers';
import { BACKGROUND_COLOR } from './palette';
import { smoothPath } from './smoothing';

// Paints a drawing in logical coordinates (PANEL_WIDTH × PANEL_HEIGHT). Callers scale the
// context for the screen; the export paints at 1:1.

/** A snapshot of the rendered drawing every this many operations (interface.md §4). */
export const SNAPSHOT_INTERVAL = 20;

const FULL_TURN = Math.PI * 2;

function paintBackground(ctx: PaintContext): void {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
}

/** One stroke; also the stroke in progress, painted over the committed drawing. */
export function drawStroke(ctx: PaintContext, stroke: NewStroke): void {
  const color = stroke.tool === 'eraser' ? BACKGROUND_COLOR : stroke.color;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const segment of smoothPath(stroke.points)) {
    switch (segment.kind) {
      case 'dot':
        ctx.arc(segment.at.x, segment.at.y, stroke.size / 2, 0, FULL_TURN);
        ctx.fill();
        return;
      case 'move':
        ctx.moveTo(segment.to.x, segment.to.y);
        break;
      case 'quad':
        ctx.quadraticCurveTo(segment.control.x, segment.control.y, segment.to.x, segment.to.y);
        break;
      case 'line':
        ctx.lineTo(segment.to.x, segment.to.y);
        break;
      default:
        segment satisfies never;
    }
  }
  ctx.stroke();
}

function drawOperation(ctx: PaintContext, op: DrawingOperation): void {
  switch (op.kind) {
    case 'stroke':
      drawStroke(ctx, op);
      return;
    case 'clear':
      paintBackground(ctx);
      return;
    default:
      op satisfies never;
  }
}

interface Snapshot {
  /** The operation right before the snapshot: if it is still there, so are all before it. */
  readonly lastOp: DrawingOperation;
  readonly base: CanvasImageSource | null;
  readonly layer: Layer;
}

/**
 * The drawing rendered after every SNAPSHOT_INTERVAL operations, so undo repaints at most that
 * many operations. Undo and redo keep snapshots valid; a different stroke replaces them.
 */
export class SnapshotCache {
  private readonly snapshots = new Map<number, Snapshot>();

  constructor(private readonly createLayer: CreateLayer) {}

  get size(): number {
    return this.snapshots.size;
  }

  /** The valid snapshot with most operations; drops the ones that can no longer be valid. */
  latest(doc: DrawingDocument): { opCount: number; layer: Layer } | null {
    const ops = doc.operations;
    let best: { opCount: number; layer: Layer } | null = null;
    for (const [opCount, snapshot] of this.snapshots) {
      const sameBase = snapshot.base === doc.baseImage;
      if (sameBase && ops[opCount - 1] === snapshot.lastOp) {
        if (best === null || opCount > best.opCount) {
          best = { opCount, layer: snapshot.layer };
        }
      } else if (!sameBase || ops.length >= opCount) {
        // Another base, or another operation in that place: this history is gone for good.
        // (A snapshot beyond the end may still come back with redo.)
        this.snapshots.delete(opCount);
      }
    }
    return best;
  }

  store(doc: DrawingDocument, opCount: number, from: PaintContext): void {
    const lastOp = doc.operations[opCount - 1];
    if (lastOp === undefined) {
      return;
    }
    const layer = this.createLayer();
    layer.ctx.drawImage(from.canvas, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    this.snapshots.set(opCount, { lastOp, base: doc.baseImage, layer });
  }
}

/**
 * Paints the whole document in logical coordinates: white background, base image (R48), then
 * every operation. With a cache, starts from the latest snapshot and stores new ones.
 */
export function renderDocument(
  ctx: PaintContext,
  doc: DrawingDocument,
  cache?: SnapshotCache,
): void {
  const snapshot = cache?.latest(doc) ?? null;
  let start = 0;
  if (snapshot) {
    ctx.drawImage(snapshot.layer.ctx.canvas, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    start = snapshot.opCount;
  } else {
    paintBackground(ctx);
    if (doc.baseImage) {
      ctx.drawImage(doc.baseImage, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    }
  }
  const ops = doc.operations;
  for (let index = start; index < ops.length; index++) {
    const op = ops[index];
    if (op) {
      drawOperation(ctx, op);
    }
    if (cache && (index + 1) % SNAPSHOT_INTERVAL === 0) {
      cache.store(doc, index + 1, ctx);
    }
  }
}
