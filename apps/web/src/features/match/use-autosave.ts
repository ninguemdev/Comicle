import { AUTOSAVE_INTERVAL_MS, type Ack } from '@comicle/shared';
import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';

import type { DrawingEditorHandle } from '../drawing/drawing-editor';

export interface AutosaveOptions {
  editor: RefObject<DrawingEditorHandle | null>;
  /** The editor's latest `revision`. */
  revision: number;
  /** Off once the panel is handed in. */
  enabled: boolean;
  save: (png: Uint8Array) => Promise<Ack<unknown>>;
}

/** R39: every AUTOSAVE_INTERVAL_MS, the current PNG, but only if the drawing changed. */
export function useAutosave({ editor, revision, enabled, save }: AutosaveOptions): void {
  /** The revision of the last autosave (0: the untouched canvas, never saved). */
  const saved = useRef(0);
  const busy = useRef(false);

  const tick = useEffectEvent(async () => {
    if (busy.current || revision === saved.current) {
      return;
    }
    busy.current = true;
    try {
      const png = await editor.current?.exportPng();
      // An emptied canvas has nothing to save; the server keeps the previous draft.
      // A failed save (offline, T18) is tried again at the next tick, changed or not.
      if (!png || (await save(png)).ok) {
        saved.current = revision;
      }
    } finally {
      busy.current = false;
    }
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const interval = setInterval(() => void tick(), AUTOSAVE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [enabled]);
}
