import { useEffect, useImperativeHandle, useState, type Ref } from 'react';

import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { DrawingCanvas } from './drawing-canvas';
import {
  DrawingDocument,
  type DrawingTool,
  type NewFill,
  type NewStroke,
} from './engine/drawing-document';
import { exportPng } from './engine/export';
import { loadImage } from './load-image';
import {
  DEFAULT_BRUSH_OPACITY,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_COLOR,
  stepBrushSize,
} from './engine/palette';
import { Toolbar } from './toolbar';
import { useDrawingShortcuts } from './use-drawing-shortcuts';

const texts = strings.drawing;

export interface DrawingEditorHandle {
  /** The panel as a PANEL_WIDTH × PANEL_HEIGHT PNG, or `null` when nothing was drawn (R40). */
  exportPng: () => Promise<Uint8Array | null>;
}

export interface DrawingEditorProps {
  /** R48: the restored draft, drawn under the new strokes and never undone. */
  baseImageUrl?: string | undefined;
  disabled: boolean;
  /** The drawing changed (stroke, undo, redo or clear); `revision` only grows (R39). */
  onChange: (revision: number) => void;
  ref?: Ref<DrawingEditorHandle>;
}

/**
 * The drawing editor (interface.md §4), isolated from the match: it takes props and hands back
 * a PNG through `ref.exportPng()`. Autosave, submission and the timer belong to the caller.
 */
export function DrawingEditor({ baseImageUrl, disabled, onChange, ref }: DrawingEditorProps) {
  const [doc] = useState(() => new DrawingDocument());
  const [revision, setRevision] = useState(doc.revision);
  const [tool, setTool] = useState<DrawingTool>('brush');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [size, setSize] = useState(DEFAULT_BRUSH_SIZE);
  const [opacity, setOpacity] = useState(DEFAULT_BRUSH_OPACITY);
  const [confirmingClear, setConfirmingClear] = useState(false);

  useImperativeHandle(ref, () => ({ exportPng: () => exportPng(doc) }), [doc]);

  useEffect(() => {
    if (baseImageUrl === undefined) {
      return;
    }
    let current = true;
    loadImage(baseImageUrl)
      .then((image) => {
        if (current) {
          doc.setBaseImage(image);
          setRevision(doc.revision);
        }
      })
      .catch(() => {
        // An unreadable draft is not worth blocking the round: the player starts blank.
      });
    return () => {
      current = false;
    };
  }, [doc, baseImageUrl]);

  /** Every change made by the player goes through here. */
  function changed(): void {
    setRevision(doc.revision);
    onChange(doc.revision);
  }

  function addStroke(stroke: NewStroke): void {
    doc.addStroke(stroke);
    changed();
  }

  function addFill(fill: NewFill): void {
    doc.addFill(fill);
    changed();
  }

  function undo(): void {
    if (doc.undo()) {
      changed();
    }
  }

  function redo(): void {
    if (doc.redo()) {
      changed();
    }
  }

  function confirmClear(): void {
    setConfirmingClear(false);
    if (doc.clear()) {
      changed();
    }
  }

  useDrawingShortcuts(!disabled && !confirmingClear, {
    selectTool: setTool,
    stepSize: (direction) => {
      setSize((current) => stepBrushSize(current, direction));
    },
    undo,
    redo,
  });

  return (
    <div className="flex size-full min-h-0 flex-col gap-3 landscape:flex-row md:flex-row">
      <Toolbar
        className="order-last landscape:order-first md:order-first"
        tool={tool}
        color={color}
        size={size}
        opacity={opacity}
        canUndo={doc.canUndo}
        canRedo={doc.canRedo}
        canClear={!doc.isEmpty}
        disabled={disabled}
        onTool={setTool}
        onColor={(next) => {
          setColor(next);
          // A color is for painting: it leaves the eraser, but the bucket keeps it.
          setTool((current) => (current === 'eraser' ? 'brush' : current));
        }}
        onSize={setSize}
        onOpacity={setOpacity}
        onUndo={undo}
        onRedo={redo}
        onClear={() => {
          setConfirmingClear(true);
        }}
      />
      <DrawingCanvas
        document={doc}
        revision={revision}
        brush={{ tool, color, size, opacity }}
        disabled={disabled}
        onStroke={addStroke}
        onFill={addFill}
      />
      <Dialog
        open={confirmingClear}
        title={texts.clearTitle}
        onClose={() => {
          setConfirmingClear(false);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmingClear(false);
              }}
            >
              {texts.cancel}
            </Button>
            <Button variant="danger" onClick={confirmClear}>
              {texts.clearConfirm}
            </Button>
          </>
        }
      >
        <p>{texts.clearBody}</p>
      </Dialog>
    </div>
  );
}
