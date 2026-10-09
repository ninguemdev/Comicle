import { useEffect, useRef } from 'react';

import { isTextEntry } from '../../lib/keyboard';

// Host shortcuts of the presentation (interface.md §5): `→`/`Espaço` advance, `←` goes back,
// `F` shows the full comic.

export interface PresentationShortcutActions {
  next: () => void;
  prev: () => void;
  showFull: () => void;
}

/** Space and Enter on a focused button already click it; handling them too would act twice. */
function isButton(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('button, a[href]') !== null;
}

function actionFor(
  event: KeyboardEvent,
  actions: PresentationShortcutActions,
): (() => void) | null {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  switch (event.key) {
    case 'ArrowRight':
      return actions.next;
    case ' ':
      return isButton(event.target) ? null : actions.next;
    case 'ArrowLeft':
      return actions.prev;
    case 'f':
    case 'F':
      return actions.showFull;
    default:
      return null;
  }
}

/** Listens on the window while `enabled`; the latest actions are always used. */
export function usePresentationShortcuts(
  enabled: boolean,
  actions: PresentationShortcutActions,
): void {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.repeat || isTextEntry(event.target)) {
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
