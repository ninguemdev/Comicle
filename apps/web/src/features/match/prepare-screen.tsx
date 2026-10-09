import type { PlayerView } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';
import { ProgressPill } from '../../ui/progress-pill';
import { SpeechBubble } from '../../ui/speech-bubble';
import { MemberList } from './simple-screens';
import { ThemeLine } from './theme-line';

const texts = strings.match;

/**
 * R36: after `round:ready`, only the theme and the others' progress. This screen imports nothing
 * that can show a panel.
 */
export function PrepareScreen({ view, theme }: { view: PlayerView; theme: string }) {
  const participants = view.room.members.filter((member) => member.role === 'participant');
  const done = participants.filter((member) => member.progress === 'done').length;
  return (
    <div className="flex flex-col gap-6">
      <ThemeLine theme={theme} />
      <SpeechBubble>{texts.prepare.message}</SpeechBubble>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-bold">{texts.prepare.waiting}</p>
          <ProgressPill done={done} total={participants.length} />
        </div>
        <MemberList view={view} members={participants} />
      </div>
    </div>
  );
}
