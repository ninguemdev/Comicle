import { Link, useParams } from 'react-router';

import { strings } from '../../strings/pt-BR';
import { buttonClassName } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';

/** Placeholder until T09: lobby, match and presentation are states of this route. */
export function RoomPage() {
  const { code = '' } = useParams();
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="font-display text-5xl tracking-wide break-all">{strings.room.title(code)}</h1>
      <SpeechBubble>{strings.room.comingSoon}</SpeechBubble>
      <Link to="/" className={buttonClassName('ghost')}>
        {strings.navigation.backHome}
      </Link>
    </div>
  );
}
