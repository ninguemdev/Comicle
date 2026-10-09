import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { strings } from '../../strings/pt-BR';
import { bufferSize, fitPanel, toLogical, type Size } from './engine/coordinates';
import type { DrawingDocument, NewStroke, Point } from './engine/drawing-document';
import { createPanelLayer, type Layer } from './engine/layers';
import { PointerPolicy } from './engine/pointer-policy';
import { drawStroke, renderDocument, SnapshotCache } from './engine/renderer';

export interface BrushSettings {
  tool: NewStroke['tool'];
  color: string;
  size: number;
}

export interface DrawingCanvasProps {
  document: DrawingDocument;
  /** `document.revision`: repaints the committed drawing when it changes. */
  revision: number;
  brush: BrushSettings;
  disabled: boolean;
  /** A finished stroke, in logical coordinates. */
  onStroke: (stroke: NewStroke) => void;
}

/** A canvas without 2D support (jsdom, very old browsers) leaves the editor inert, not broken. */
function tryCreateLayer(): Layer | null {
  try {
    return createPanelLayer();
  } catch {
    return null;
  }
}

/** Every position the browser sampled since the last event, not only the last one. */
function sampledPoints(event: PointerEvent, rect: DOMRect): Point[] {
  // Not every browser coalesces (older Safari); then the event itself is the only sample.
  const samples = 'getCoalescedEvents' in event ? event.getCoalescedEvents() : [];
  return (samples.length > 0 ? samples : [event]).map((sample) =>
    toLogical(sample.clientX, sample.clientY, rect),
  );
}

/**
 * The drawing surface (interface.md §4, Superfície): fits the space it gets in 4:3, keeps a sharp
 * buffer for the device pixel ratio and turns pointer input into strokes in logical space.
 */
export function DrawingCanvas({
  document,
  revision,
  brush,
  disabled,
  onStroke,
}: DrawingCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cssSize, setCssSize] = useState<Size>({ width: 0, height: 0 });
  /** The committed drawing at logical size; the screen shows it scaled. */
  const committed = useRef<{ layer: Layer; cache: SnapshotCache } | null>(null);
  const policy = useRef(new PointerPolicy());
  const live = useRef<NewStroke | null>(null);
  const frameRequest = useRef<number | null>(null);

  function paint(): void {
    frameRequest.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !committed.current) {
      return;
    }
    ctx.setTransform(canvas.width / PANEL_WIDTH, 0, 0, canvas.height / PANEL_HEIGHT, 0, 0);
    ctx.drawImage(committed.current.layer.ctx.canvas, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    if (live.current) {
      drawStroke(ctx, live.current);
    }
  }

  /** At most one paint per frame, however many pointer events arrive. */
  function schedulePaint(): void {
    frameRequest.current ??= requestAnimationFrame(paint);
  }

  useEffect(() => {
    return () => {
      if (frameRequest.current !== null) {
        cancelAnimationFrame(frameRequest.current);
      }
    };
  }, []);

  // Fit the canvas to the space it gets, in 4:3.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const measure = () => {
      setCssSize(fitPanel({ width: frame.clientWidth, height: frame.clientHeight }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => {
      observer.disconnect();
    };
  }, []);

  // A new size (or a new screen density) needs a new buffer, which starts blank.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const buffer = bufferSize(cssSize, window.devicePixelRatio);
    canvas.width = buffer.width;
    canvas.height = buffer.height;
    paint();
  }, [cssSize]);

  // Repaint the committed drawing whenever the document changes.
  useEffect(() => {
    committed.current ??= (() => {
      const layer = tryCreateLayer();
      return layer && { layer, cache: new SnapshotCache(createPanelLayer) };
    })();
    if (committed.current) {
      renderDocument(committed.current.layer.ctx, document, committed.current.cache);
    }
    paint();
  }, [document, revision]);

  // Disabling mid-stroke drops the stroke: the panel may already be on its way.
  useEffect(() => {
    if (disabled) {
      policy.current.reset();
      live.current = null;
      paint();
    }
  }, [disabled]);

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    if (policy.current.down(event) === 'ignore') {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    live.current = { ...brush, points: [toLogical(event.clientX, event.clientY, rect)] };
    schedulePaint();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const stroke = live.current;
    if (!stroke || !policy.current.owns(event)) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    live.current = {
      ...stroke,
      points: [...stroke.points, ...sampledPoints(event.nativeEvent, rect)],
    };
    schedulePaint();
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const stroke = live.current;
    if (!policy.current.up(event) || !stroke) {
      return;
    }
    live.current = null;
    onStroke(stroke);
  }

  return (
    <div ref={frameRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={strings.drawing.canvas}
        aria-disabled={disabled}
        style={{ width: cssSize.width, height: cssSize.height }}
        className={`touch-none rounded-md border-comic shadow-pop select-none ${
          disabled ? 'cursor-not-allowed' : 'cursor-crosshair'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
