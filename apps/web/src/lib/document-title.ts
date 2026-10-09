import { useEffect } from 'react';

import { strings } from '../strings/pt-BR';

/** "Seu perfil · Comicle"; `null` is the start screen, just "Comicle". */
export function documentTitle(screen: string | null): string {
  return screen === null ? strings.app.title : strings.app.screenTitle(screen);
}

/** The tab title of the screen on view, so tabs, history and screen readers tell screens apart. */
export function useDocumentTitle(screen: string | null): void {
  useEffect(() => {
    document.title = documentTitle(screen);
  }, [screen]);
}
