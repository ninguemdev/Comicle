import { useEffect, useState } from 'react';

import { fetchMyDraft } from '../../lib/my-draft';
import { useSessionStore } from '../../stores/session-store';

/**
 * R48, R66: back in the drawing (reload, reconnection), the player's own drafts as `blob:` URLs
 * for the editors' base layers, by panel index. Only what the server had when the screen opened;
 * revoked on unmount.
 */
export function useMyDrafts(
  roomCode: string,
  draftPanels: readonly number[],
): ReadonlyMap<number, string> {
  // The drafts matter when the screen opens; later autosaves are this very drawing.
  const [restore] = useState(() => [...draftPanels]);
  const token = useSessionStore((state) => state.token);
  const [urls, setUrls] = useState<ReadonlyMap<number, string>>(() => new Map());

  useEffect(() => {
    if (restore.length === 0 || token === null) {
      return;
    }
    const controller = new AbortController();
    const created: string[] = [];
    for (const panelIndex of restore) {
      fetchMyDraft(roomCode, panelIndex, token, controller.signal)
        .then((blob) => {
          if (blob !== null && !controller.signal.aborted) {
            const url = URL.createObjectURL(blob);
            created.push(url);
            setUrls((current) => new Map(current).set(panelIndex, url));
          }
        })
        .catch(() => {
          // Without the draft the player simply starts that panel over: the round goes on.
        });
    }
    return () => {
      controller.abort();
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
  }, [restore, roomCode, token]);

  return urls;
}
