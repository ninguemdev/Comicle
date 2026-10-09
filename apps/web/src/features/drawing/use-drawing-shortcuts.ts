import { useEffect, useRef } from 'react';

import { isTextEntry } from '../../lib/keyboard';
import type { DrawingTool } from './engine/drawing-document';

// Keyboard shortcuts of the editor (interface.md §4, Ferramentas). "Concluir" (Ctrl/⌘+Enter)
// belongs to the drawing screen, which is the one that hands the panel in.

export interface DrawingShortcutActions {
  selectTool: (tool: DrawingTool) => void;
  /** -1 for a thinner brush, +1 for a thicker one. */
  stepSize: (direction: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
}

const TOOL_KEYS: Readonly<Record<string, DrawingTool>> = { b: 'brush', e: 'eraser' };
const SIZE_KEYS: Readonly<Record<string, -1 | 1>> = { '[': -1, ']': 1 };

/** The action a key press asks for, or null when the editor should let it through. */
function actionFor(event: KeyboardEvent, actions: DrawingShortcutActions): (() => void) | null {
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key !== 'z' || event.altKey) {
      return null;
    }
    return event.shiftKey ? actions.redo : actions.undo;
  }
  if (event.altKey) {
    return null;
  }
  const tool = TOOL_KEYS[key];
  if (tool !== undefined) {
    return () => {
      actions.selectTool(tool);
    };
  }
  const direction = SIZE_KEYS[key];
  if (direction !== undefined) {
    return () => {
      actions.stepSize(direction);
    };
  }
  return null;
}

/** Listens on the window while `enabled`; the latest actions are always used. */
export function useDrawingShortcuts(enabled: boolean, actions: DrawingShortcutActions): void {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || isTextEntry(event.target)) {
        return;
      }
      const action = actionFor(event, latest.current);
      if (action) {
        event.preventDefault();
        action();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}
