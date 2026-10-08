import { Link } from 'react-router';

import { strings } from '../../strings/pt-BR';
import { buttonClassName } from '../../ui/button';
import { Logo } from '../../ui/logo';
import { SpeechBubble } from '../../ui/speech-bubble';

/** Placeholder until T09 (create and join a room). */
export function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 py-6 text-center">
      <h1>
        <Logo />
      </h1>
      <p className="text-lg font-semibold text-muted">{strings.app.tagline}</p>
      <SpeechBubble>{strings.home.comingSoon}</SpeechBubble>
      <Link to="/perfil" className={buttonClassName('secondary')}>
        {strings.home.editProfile}
      </Link>
    </div>
  );
}
