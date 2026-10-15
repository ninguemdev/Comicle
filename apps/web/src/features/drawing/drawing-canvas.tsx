import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { strings } from '../../strings/pt-BR';
import { bufferSize, cursorDiameter, fitPanel, toLogical, type Size } from './engine/coordinates';
import type {
  DrawingDocument,
  DrawingTool,
  NewFill,
  NewStroke,
  Point,
} from './engine/drawing-document';
import { pickedColor, pixelUnder } from './engine/eyedropper';
import { createPanelLayer, type Layer } from './engine/layers';
import { PointerPolicy } from './engine/pointer-policy';
import { drawStroke, renderDocument, SnapshotCache } from './engine/renderer';

export interface BrushSettings {
  tool: DrawingTool;
  color: string;
  size: number;
  opacity: number;
}

export interface DrawingCanvasProps {
  document: DrawingDocument;
  /** `document.revision`: repaints the committed drawing when it changes. */
  revision: number;
  brush: BrushSettings;
  disabled: boolean;
  /** A finished stroke, in logical coordinates. */
  onStroke: (stroke: NewStroke) => void;
  /** A click with the bucket, in logical coordinates. */
  onFill: (fill: NewFill) => void;
  /** A click with the eyedropper: the color under it, as `#RRGGBB`. */
  onPick: (color: string) => void;
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
  onFill,
  onPick,
}: DrawingCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cssSize, setCssSize] = useState<Size>({ width: 0, height: 0 });
  /**
   * The committed drawing at logical size; the screen shows it scaled. One snapshot cache per
   * document, so switching between the panels of a story (R65) keeps each one's.
   */
  const committed = useRef<{
    layer: Layer;
    caches: WeakMap<DrawingDocument, SnapshotCache>;
  } | null>(null);
  const policy = useRef(new PointerPolicy());
  const live = useRef<NewStroke | null>(null);
  const frameRequest = useRef<number | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  /** A mouse or pen over the canvas: touch has nothing hovering to show. */
  const [hovering, setHovering] = useState(false);

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
      return layer && { layer, caches: new WeakMap() };
    })();
    if (committed.current) {
      const { caches } = committed.current;
      let cache = caches.get(document);
      if (!cache) {
        cache = new SnapshotCache(createPanelLayer);
        caches.set(document, cache);
      }
      renderDocument(committed.current.layer.ctx, document, cache);
    }
    paint();
  }, [document, revision]);

  // Disabling mid-stroke drops the stroke: the panel may already be on its way. Another document
  // (another panel of the story, R65) drops it too: it belongs to the panel left behind.
  useEffect(() => {
    if (disabled) {
      policy.current.reset();
      live.current = null;
      paint();
    }
  }, [disabled]);
  useEffect(() => {
    policy.current.reset();
    live.current = null;
  }, [document]);

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    if (policy.current.down(event) === 'ignore') {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const at = toLogical(event.clientX, event.clientY, rect);
    const { tool, color, size, opacity } = brush;
    if (tool === 'fill') {
      // One click is the whole action: nothing follows the pointer.
      policy.current.reset();
      onFill({ color, at });
      return;
    }
    if (tool === 'eyedropper') {
      policy.current.reset();
      // The committed drawing at logical size: what the panel will be, without the live stroke.
      const layer = committed.current?.layer;
      if (layer) {
        const pixel = pixelUnder(at);
        onPick(pickedColor(layer.ctx.getImageData(pixel.x, pixel.y, 1, 1).data));
      }
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    live.current = { tool, color, size, opacity, points: [at] };
    schedulePaint();
  }

  /** Places the brush cursor under a hovering mouse or pen. */
  function trackCursor(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const hovers = event.pointerType !== 'touch';
    setHovering(hovers);
    const cursor = cursorRef.current;
    if (!hovers || !cursor) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    cursor.style.left = `${String(event.clientX - rect.left)}px`;
    cursor.style.top = `${String(event.clientY - rect.top)}px`;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    trackCursor(event);
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

  // The circle stands for the stroke; the bucket and the eyedropper act on one point, so they
  // keep the crosshair.
  const showCursor = hovering && !disabled && (brush.tool === 'brush' || brush.tool === 'eraser');
  const diameter = cursorDiameter(brush.size, cssSize.width);

  return (
    <div ref={frameRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={strings.drawing.canvas}
          aria-disabled={disabled}
          style={{ width: cssSize.width, height: cssSize.height }}
          className={`block touch-none rounded-md border-comic shadow-pop select-none ${
            disabled ? 'cursor-not-allowed' : showCursor ? 'cursor-none' : 'cursor-crosshair'
          }`}
          onPointerDown={handlePointerDown}
          onPointerEnter={trackCursor}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => {
            setHovering(false);
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div
          ref={cursorRef}
          aria-hidden="true"
          // A dark ring between two white ones shows over any color. `night` is the token that
          // never inverts: the theme drops Tailwind's own colors, and `ink` turns light in dark mode.
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-night shadow-[0_0_0_1px_white,inset_0_0_0_1px_white] ${
            showCursor ? 'block' : 'hidden'
          }`}
          style={{ width: diameter, height: diameter }}
        />
      </div>
    </div>
  );
}
