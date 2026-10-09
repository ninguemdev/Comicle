import { useEffect, useState } from 'react';

import { fetchMyDraft } from '../../lib/my-draft';
import { useSessionStore } from '../../stores/session-store';

/**
 * R48: back in the drawing (reload, reconnection), the player's own draft as a `blob:` URL for
 * the editor's base layer. Only what the server had when the screen opened; revoked on unmount.
 */
export function useMyDraft(roomCode: string, hasDraft: boolean): string | undefined {
  // The draft matters when the screen opens; later autosaves are this very drawing.
  const [restore] = useState(hasDraft);
  const token = useSessionStore((state) => state.token);
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!restore || token === null) {
      return;
    }
    const controller = new AbortController();
    let created: string | null = null;
    fetchMyDraft(roomCode, token, controller.signal)
      .then((blob) => {
        if (blob !== null && !controller.signal.aborted) {
          created = URL.createObjectURL(blob);
          setUrl(created);
        }
      })
      .catch(() => {
        // Without the draft the player simply starts over: the round goes on.
      });
    return () => {
      controller.abort();
      if (created !== null) {
        URL.revokeObjectURL(created);
      }
    };
  }, [restore, roomCode, token]);

  return url;
}
