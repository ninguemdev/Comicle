import { useState, type ReactNode } from 'react';

import { strings } from '../../strings/pt-BR';
import { BrushIcon, EraserIcon, PaletteIcon, RedoIcon, TrashIcon, UndoIcon } from '../../ui/icons';
import type { DrawingTool } from './engine/drawing-document';
import { BRUSH_SIZES, DRAWING_COLORS, type BrushSize, type DrawingColorId } from './engine/palette';

const texts = strings.drawing;

const COLOR_IDS = Object.keys(DRAWING_COLORS).filter(
  (id): id is DrawingColorId => id in DRAWING_COLORS,
);

/** The largest dot shown for a brush size, so 32 still fits in its button. */
const MAX_SIZE_PREVIEW = 24;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export interface ToolbarProps {
  tool: DrawingTool;
  color: string;
  size: BrushSize;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  disabled: boolean;
  onTool: (tool: DrawingTool) => void;
  onColor: (color: string) => void;
  onSize: (size: BrushSize) => void;
  onUndo: () => void;
  onRedo: () => void;
  /** Asks to clear; the editor confirms first. */
  onClear: () => void;
  className?: string;
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg border-comic transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed === true ? 'bg-pop-yellow' : 'bg-paper hover:bg-pop-yellow/40'
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center justify-center gap-2 landscape:flex-col md:flex-col"
    >
      {children}
    </div>
  );
}

/**
 * Brush, eraser, colors, sizes and history (interface.md §4). Desktop: a column left of the
 * canvas; phone in portrait: a row below it, colors in a popover; phone in landscape: a column.
 */
export function Toolbar(props: ToolbarProps) {
  const { tool, color, size, disabled } = props;
  const [colorsOpen, setColorsOpen] = useState(false);

  function pickColor(next: string): void {
    props.onColor(next);
    setColorsOpen(false);
  }

  return (
    <div
      aria-label={texts.toolbar}
      role="group"
      className={`flex flex-wrap items-center justify-center gap-3 landscape:flex-col md:flex-col ${props.className ?? ''}`}
    >
      <Group label={texts.tools}>
        <ToolButton
          label={texts.brush}
          pressed={tool === 'brush'}
          disabled={disabled}
          onClick={() => {
            props.onTool('brush');
          }}
        >
          <BrushIcon />
        </ToolButton>
        <ToolButton
          label={texts.eraser}
          pressed={tool === 'eraser'}
          disabled={disabled}
          onClick={() => {
            props.onTool('eraser');
          }}
        >
          <EraserIcon />
        </ToolButton>
      </Group>

      <div className="relative">
        <button
          type="button"
          aria-label={texts.showColors}
          aria-expanded={colorsOpen}
          disabled={disabled}
          onClick={() => {
            setColorsOpen((open) => !open);
          }}
          className="flex size-11 items-center justify-center rounded-lg border-comic bg-paper md:hidden"
        >
          <PaletteIcon className="size-5" />
          <span
            aria-hidden="true"
            className="absolute right-1 bottom-1 size-3 rounded-full border-2 border-ink"
            style={{ backgroundColor: color }}
          />
        </button>
        <div
          role="group"
          aria-label={texts.colors}
          className={`${colorsOpen ? 'grid' : 'hidden'} absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 grid-cols-4 gap-2 rounded-lg border-comic bg-paper p-2 shadow-pop landscape:bottom-auto landscape:top-0 landscape:left-full landscape:mb-0 landscape:ml-2 landscape:translate-x-0 md:static md:grid md:translate-x-0 md:border-0 md:p-0 md:shadow-none landscape:md:ml-0`}
        >
          {COLOR_IDS.map((id) => {
            const hex = DRAWING_COLORS[id];
            return (
              <button
                key={id}
                type="button"
                aria-label={texts.colorNames[id]}
                title={texts.colorNames[id]}
                aria-pressed={color.toUpperCase() === hex}
                disabled={disabled}
                onClick={() => {
                  pickColor(hex);
                }}
                style={{ backgroundColor: hex }}
                className="size-11 rounded-md border-2 border-ink aria-pressed:outline-4 aria-pressed:outline-offset-1 aria-pressed:outline-pop-blue disabled:opacity-40 md:size-7"
              />
            );
          })}
          <input
            type="color"
            aria-label={texts.customColor}
            title={texts.customColor}
            disabled={disabled}
            value={HEX_COLOR.test(color) ? color.toLowerCase() : '#000000'}
            onChange={(event) => {
              pickColor(event.target.value.toUpperCase());
            }}
            className="col-span-4 h-9 w-full cursor-pointer rounded-md border-2 border-ink bg-paper"
          />
        </div>
      </div>

      <Group label={texts.sizes}>
        {BRUSH_SIZES.map((brushSize) => {
          const preview = Math.min(brushSize, MAX_SIZE_PREVIEW);
          return (
            <ToolButton
              key={brushSize}
              label={texts.size(brushSize)}
              pressed={size === brushSize}
              disabled={disabled}
              onClick={() => {
                props.onSize(brushSize);
              }}
            >
              <span
                aria-hidden="true"
                className="rounded-full bg-current"
                style={{ width: preview, height: preview }}
              />
            </ToolButton>
          );
        })}
      </Group>

      <Group label={texts.history}>
        <ToolButton label={texts.undo} disabled={disabled || !props.canUndo} onClick={props.onUndo}>
          <UndoIcon />
        </ToolButton>
        <ToolButton label={texts.redo} disabled={disabled || !props.canRedo} onClick={props.onRedo}>
          <RedoIcon />
        </ToolButton>
        <ToolButton
          label={texts.clear}
          disabled={disabled || !props.canClear}
          onClick={props.onClear}
        >
          <TrashIcon />
        </ToolButton>
      </Group>
    </div>
  );
}
