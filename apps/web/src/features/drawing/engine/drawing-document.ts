// The drawing as a list of operations, with undo and redo (interface.md §4, Modelo). Pure: no
// canvas, no React.

import { BACKGROUND_COLOR } from './palette';

/** Tools that paint along the pointer. */
export type StrokeTool = 'brush' | 'eraser';

/** The bucket fills the area around one click instead. */
export type DrawingTool = StrokeTool | 'fill';

/** A point in the logical space of the panel (PANEL_WIDTH × PANEL_HEIGHT). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface StrokeOperation {
  readonly kind: 'stroke';
  readonly tool: StrokeTool;
  readonly color: string;
  readonly size: number;
  readonly points: readonly Point[];
}

export interface ClearOperation {
  readonly kind: 'clear';
}

/** The paint bucket at one point, over the pixels as they are when it is applied. */
export interface FillOperation {
  readonly kind: 'fill';
  readonly color: string;
  readonly at: Point;
}

export type DrawingOperation = StrokeOperation | ClearOperation | FillOperation;

export type NewStroke = Omit<StrokeOperation, 'kind'>;
export type NewFill = Omit<FillOperation, 'kind'>;

/** Whether an operation leaves a mark: the eraser and a background-colored fill do not. */
function marks(op: DrawingOperation): boolean {
  switch (op.kind) {
    case 'stroke':
      return op.tool === 'brush';
    case 'fill':
      return op.color.toUpperCase() !== BACKGROUND_COLOR;
    case 'clear':
      return false;
    default:
      return op satisfies never;
  }
}

/** How many steps can be undone. */
export const UNDO_LIMIT = 100;

export class DrawingDocument {
  private readonly ops: DrawingOperation[] = [];
  private readonly redoStack: DrawingOperation[] = [];
  /** Operations below this index can no longer be undone (UNDO_LIMIT), but still render. */
  private undoFloor = 0;
  private base: CanvasImageSource | null = null;
  private rev = 0;

  get operations(): readonly DrawingOperation[] {
    return this.ops;
  }

  /** R48: the restored draft, drawn under every operation and never undone. */
  get baseImage(): CanvasImageSource | null {
    return this.base;
  }

  /** Grows on every change, so callers can tell the drawing changed (R39). */
  get revision(): number {
    return this.rev;
  }

  get canUndo(): boolean {
    return this.ops.length > this.undoFloor;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Nothing visible to hand in (R40): no brush stroke or fill after the last `clear`, and no
   * base image unless a `clear` covered it. The eraser and a white fill only paint the background.
   */
  get isEmpty(): boolean {
    const lastClear = this.ops.findLastIndex((op) => op.kind === 'clear');
    const drawnSince = this.ops.slice(lastClear + 1).some(marks);
    return !drawnSince && (this.base === null || lastClear >= 0);
  }

  addStroke(stroke: NewStroke): void {
    if (stroke.points.length === 0) {
      return;
    }
    this.push({ kind: 'stroke', ...stroke });
  }

  addFill(fill: NewFill): void {
    this.push({ kind: 'fill', ...fill });
  }

  /** Clearing is a step of its own, so it can be undone. Clearing nothing does nothing. */
  clear(): boolean {
    if (this.isEmpty) {
      return false;
    }
    this.push({ kind: 'clear' });
    return true;
  }

  undo(): boolean {
    if (!this.canUndo) {
      return false;
    }
    const op = this.ops.pop();
    if (op) {
      this.redoStack.push(op);
    }
    this.rev++;
    return true;
  }

  redo(): boolean {
    const op = this.redoStack.pop();
    if (!op) {
      return false;
    }
    this.ops.push(op);
    this.rev++;
    return true;
  }

  /** Not part of the history: the base is where the player left off before reconnecting. */
  setBaseImage(image: CanvasImageSource | null): void {
    this.base = image;
    this.rev++;
  }

  private push(op: DrawingOperation): void {
    this.ops.push(op);
    // A new step makes the undone ones unreachable.
    this.redoStack.length = 0;
    this.undoFloor = Math.max(this.undoFloor, this.ops.length - UNDO_LIMIT);
    this.rev++;
  }
}
