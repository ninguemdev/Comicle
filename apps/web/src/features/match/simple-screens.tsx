import type { MemberView, PlayerView } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';
import { Card } from '../../ui/card';
import { PlayerChip } from '../../ui/player-chip';
import { SpeechBubble } from '../../ui/speech-bubble';

// Screens with nothing to do but wait (interface.md §2): never any drawing of anyone else.

const texts = strings.match;

/** Members with their public progress in the phase (R58: progress only, never content). */
export function MemberList({ view, members }: { view: PlayerView; members: MemberView[] }) {
  return (
    <ul className="flex flex-wrap gap-3">
      {members.map((member) => (
        <li key={member.playerId} className="max-w-full">
          <PlayerChip
            nickname={member.nickname}
            avatar={member.avatar}
            isHost={member.isHost}
            isSelf={member.playerId === view.me.playerId}
            connected={member.connected}
            progress={member.progress}
          />
        </li>
      ))}
    </ul>
  );
}

/** After the theme or the panel is in, or with nothing to do in the phase. */
export function WaitingScreen({ view, received }: { view: PlayerView; received: boolean }) {
  const missing = view.room.members.filter(
    (member) => member.role === 'participant' && member.progress === 'working',
  );
  return (
    <div className="flex flex-col gap-6">
      {received && <SpeechBubble>{texts.waiting.received}</SpeechBubble>}
      {missing.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{texts.waiting.missing}</h2>
          <MemberList view={view} members={missing} />
        </section>
      ) : (
        <p className="font-bold">{texts.waiting.everyoneDone}</p>
      )}
    </div>
  );
}

/** `round_closing`: the panels are on their way and the stories move on. */
export function TransitionScreen() {
  return <SpeechBubble>{texts.transition}</SpeechBubble>;
}

/** R10, R24: whoever is not seated watches until the presentation. */
export function SpectatorScreen({ view }: { view: PlayerView }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-lg font-semibold">{strings.room.spectating}</p>
      </Card>
      <MemberList view={view} members={view.room.members} />
    </div>
  );
}
