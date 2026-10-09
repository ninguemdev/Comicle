import { Link } from 'react-router';

import { useDocumentTitle } from '../../lib/document-title';
import { strings } from '../../strings/pt-BR';
import { buttonClassName } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';

export function NotFoundPage() {
  useDocumentTitle(strings.notFound.title);
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <p
        aria-hidden="true"
        className="-rotate-3 font-display text-9xl text-pop-red [-webkit-text-stroke:3px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:6px_6px_0_var(--color-ink)]"
      >
        {strings.notFound.code}
      </p>
      <h1 className="font-display text-4xl tracking-wide">{strings.notFound.title}</h1>
      <SpeechBubble>{strings.notFound.bubble}</SpeechBubble>
      <Link to="/" className={buttonClassName('primary')}>
        {strings.navigation.backHome}
      </Link>
    </div>
  );
}
