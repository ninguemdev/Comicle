import type { MatchView, PlayerView } from '@comicle/shared';

import { useRoomStore } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { ProgressPill } from '../../ui/progress-pill';
import { Timer } from '../../ui/timer';
import { AbortMatchButton } from './abort-match-button';

const texts = strings.match;

/** "Quadro 2 de 4" once the rounds started; nothing during the themes. */
export function roundLabel(match: MatchView): string | null {
  if (match.roundIndex < 0) {
    return null;
  }
  return texts.panelOf(match.roundIndex + 1, match.totalRounds);
}

/**
 * Phase, round, timer, progress and, for the host, the way out (R57). The presentation has its
 * own header (PresentationScreen).
 */
export function MatchHeader({ view, match }: { view: PlayerView; match: MatchView }) {
  const clockOffsetMs = useRoomStore((state) => state.clockOffsetMs);
  const label = roundLabel(match);
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col">
        <h1 className="font-display text-4xl tracking-wide">{texts.phases[match.phase]}</h1>
        {label !== null && <p className="font-bold text-muted">{label}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ProgressPill done={match.progress.done} total={match.progress.total} />
        {match.phaseDeadlineAt !== null && (
          <Timer deadlineAt={match.phaseDeadlineAt} offsetMs={clockOffsetMs} />
        )}
        {view.me.isHost && <AbortMatchButton />}
      </div>
    </header>
  );
}
