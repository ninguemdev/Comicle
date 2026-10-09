import type { MatchView, PlayerView, PresentationView } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';

const texts = strings.match;

/** Phase and round of the match, e.g. "Leitura: rodada 2 de 3". */
function matchAnnouncement(match: MatchView): string {
  const phase = texts.phases[match.phase];
  const round = match.roundIndex >= 0 ? match.roundIndex + 1 : null;
  return texts.announce(phase, round, match.totalRounds);
}

/** Every step of the presentation, e.g. "História 1 de 3: quadro 2". */
function presentationAnnouncement(presentation: PresentationView): string {
  const announce = texts.presentation.announce;
  if (presentation.status === 'finished') {
    return announce.finished;
  }
  const story = presentation.storyIndex + 1;
  const total = presentation.storyCount;
  const { step } = presentation;
  switch (step.kind) {
    case 'theme':
      return announce.theme(story, total);
    case 'panel':
      return announce.panel(story, total, step.position + 1);
    case 'full':
      return announce.full(story, total);
    default:
      return step satisfies never;
  }
}

/** What screen readers hear when the room changes stage (interface.md §6). */
export function roomAnnouncement(view: PlayerView): string {
  const { match } = view;
  if (match === null) {
    return strings.room.announceLobby;
  }
  return match.presentation === null
    ? matchAnnouncement(match)
    : presentationAnnouncement(match.presentation);
}

/**
 * One polite live region for the whole room. It stays mounted from the lobby to the end of the
 * presentation: a region created together with its text is often not read at all.
 */
export function RoomAnnouncer({ view }: { view: PlayerView }) {
  return (
    <p aria-live="polite" className="sr-only">
      {roomAnnouncement(view)}
    </p>
  );
}
