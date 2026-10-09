import { useDocumentTitle } from '../../lib/document-title';
import { strings } from '../../strings/pt-BR';
import { buttonClassName } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';

/**
 * Friendly screen when something crashes: a route (the router's `errorElement`) or the whole app
 * (`ErrorBoundary` in `main.tsx`). It needs no router, since the router may be what failed.
 */
export function ErrorPage() {
  useDocumentTitle(strings.crash.title);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-10 text-center">
      <h1 className="font-display text-5xl tracking-wide">{strings.crash.title}</h1>
      <SpeechBubble>{strings.crash.bubble}</SpeechBubble>
      {/* A full reload: whatever state broke the page does not come back. */}
      <a href={import.meta.env.BASE_URL} className={buttonClassName('primary')}>
        {strings.navigation.backHome}
      </a>
    </main>
  );
}
