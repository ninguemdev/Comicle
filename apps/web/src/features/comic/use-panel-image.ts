import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { fetchPanelImage } from '../../lib/panel-images';
import { useSessionStore } from '../../stores/session-store';

/** Where panel images come from; `null` = the server, with the session token. */
export type PanelImageLoader = (panelId: string, signal: AbortSignal) => Promise<Blob>;

/** Lets `/dev/comic` (and tests) draw sample images without a server. Keep the loader stable. */
export const PanelImageLoaderContext = createContext<PanelImageLoader | null>(null);

export type PanelImageState =
  { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' };

interface Loaded {
  panelId: string;
  state: PanelImageState;
}

const LOADING: PanelImageState = { status: 'loading' };

/**
 * How to load panel images right now: the custom loader, or the server with the session token;
 * `null` while there is no token yet. Changes only when the token or the loader does.
 */
export function usePanelImageLoader(): PanelImageLoader | null {
  const custom = useContext(PanelImageLoaderContext);
  const token = useSessionStore((state) => state.token);
  return useMemo(
    () =>
      custom ??
      (token === null
        ? null
        : (panelId: string, signal: AbortSignal) => fetchPanelImage(panelId, token, signal)),
    [custom, token],
  );
}

/**
 * The image of a panel as a `blob:` URL (protocolo §1), revoked when the panel goes away or
 * changes. Waits for the session token before asking the server.
 */
export function usePanelImage(panelId: string): PanelImageState {
  const load = usePanelImageLoader();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (load === null) {
      return;
    }
    const controller = new AbortController();
    let url: string | null = null;
    load(panelId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) {
          return;
        }
        url = URL.createObjectURL(blob);
        setLoaded({ panelId, state: { status: 'ready', url } });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({ panelId, state: { status: 'error' } });
        }
      });
    return () => {
      controller.abort();
      if (url !== null) {
        URL.revokeObjectURL(url);
      }
    };
  }, [panelId, load]);

  // A result for another panel is stale: this one is still on its way.
  return loaded?.panelId === panelId ? loaded.state : LOADING;
}
