import { strings } from '../../strings/pt-BR';
import { buttonClassName } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';

/** Rendered outside the layout when a route crashes, instead of React Router's default page. */
export function RouteErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-10 text-center">
      <h1 className="font-display text-5xl tracking-wide">{strings.routeError.title}</h1>
      <SpeechBubble>{strings.routeError.bubble}</SpeechBubble>
      {/* A full reload, since the router itself may be what failed. */}
      <a href={import.meta.env.BASE_URL} className={buttonClassName('primary')}>
        {strings.navigation.backHome}
      </a>
    </main>
  );
}
