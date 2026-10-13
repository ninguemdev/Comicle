import { AUTOSAVE_INTERVAL_MS, type Ack } from '@comicle/shared';
import { useEffect, useEffectEvent, useRef } from 'react';

import type { DrawingDocument } from '../drawing/engine/drawing-document';

export interface AutosaveOptions {
  /** One per panel the player draws this round (R66); a single one in the collaborative mode. */
  documents: readonly DrawingDocument[];
  /** Off once the panels are handed in. */
  enabled: boolean;
  /** The panel as a PNG, or `null` when nothing is drawn on it. */
  exportPanel: (document: DrawingDocument) => Promise<Uint8Array | null>;
  save: (panelIndex: number, png: Uint8Array) => Promise<Ack<unknown>>;
}

/**
 * R39, R66: every AUTOSAVE_INTERVAL_MS, one panel whose drawing changed since its last save; with
 * several changed panels, they take turns, so the server's limit per connection holds.
 */
export function useAutosave({ documents, enabled, exportPanel, save }: AutosaveOptions) {
  /** The revision of each panel's last autosave (absent: the untouched canvas, never saved). */
  const saved = useRef(new Map<number, number>());
  /** The panel saved last: the next tick starts looking after it. */
  const last = useRef(-1);
  const busy = useRef(false);

  function nextChanged(): number | null {
    for (let step = 1; step <= documents.length; step++) {
      const index = (last.current + step) % documents.length;
      const revision = documents[index]?.revision ?? 0;
      if (revision !== (saved.current.get(index) ?? 0)) {
        return index;
      }
    }
    return null;
  }

  const tick = useEffectEvent(async () => {
    const index = busy.current ? null : nextChanged();
    const document = index === null ? undefined : documents[index];
    if (index === null || !document) {
      return;
    }
    busy.current = true;
    const revision = document.revision;
    try {
      const png = await exportPanel(document);
      // An emptied canvas has nothing to save; the server keeps the previous draft.
      // A failed save (offline, T18) is tried again at its next turn, changed or not.
      if (!png || (await save(index, png)).ok) {
        saved.current.set(index, revision);
      }
      last.current = index;
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

  return {
    /** A restored draft (R48) is already on the server: nothing to save until it changes. */
    markSaved: (panelIndex: number, revision: number) => {
      saved.current.set(panelIndex, revision);
    },
  };
}
