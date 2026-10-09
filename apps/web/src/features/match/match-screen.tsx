import type { MatchView, PlayerView } from '@comicle/shared';
import { useState } from 'react';

import { strings } from '../../strings/pt-BR';
import { DrawingScreen } from './drawing-screen';
import { MatchHeader } from './match-header';
import { PrepareScreen } from './prepare-screen';
import { ReadingScreen } from './reading-screen';
import {
  PresentationPlaceholder,
  SpectatorScreen,
  TransitionScreen,
  WaitingScreen,
} from './simple-screens';
import { ThemeScreen } from './theme-screen';

interface DrawingTask {
  roundIndex: number;
  theme: string;
}

export type MatchScreenId =
  | 'theme'
  | 'reading'
  | 'prepare'
  | 'drawing'
  | 'waiting'
  | 'transition'
  | 'spectator'
  | 'presentation';

/** The screen for a match view (interface.md §2): decided by `phase` and the player's task only. */
export function screenFor(match: MatchView): MatchScreenId {
  const { task } = match;
  switch (task.kind) {
    case 'write_theme':
      return task.status === 'writing' ? 'theme' : 'waiting';
    case 'read_story':
      return task.status === 'reading' ? 'reading' : 'prepare';
    case 'draw_panel':
      return task.status === 'drawing' ? 'drawing' : 'waiting';
    case 'wait':
      return match.phase === 'round_closing' ? 'transition' : 'waiting';
    case 'spectate':
      return 'spectator';
    case 'watch':
      return 'presentation';
    default:
      return task satisfies never;
  }
}

/** Phase and round, for screen readers (interface.md §6). */
function announcement(match: MatchView): string {
  const phase = strings.match.phases[match.phase];
  const inRounds = match.roundIndex >= 0 && match.phase !== 'presentation';
  return strings.match.announce(phase, inRounds ? match.roundIndex + 1 : null, match.totalRounds);
}

function ScreenBody({
  view,
  match,
  screen,
}: {
  view: PlayerView;
  match: MatchView;
  screen: Exclude<MatchScreenId, 'drawing'>;
}) {
  const { task } = match;
  switch (screen) {
    case 'theme':
      return <ThemeScreen draft={task.kind === 'write_theme' ? task.draft : ''} />;
    case 'reading':
      return task.kind === 'read_story' && task.status === 'reading' ? (
        <ReadingScreen
          theme={task.theme}
          panels={task.previousPanels}
          roundIndex={match.roundIndex}
        />
      ) : null;
    case 'prepare':
      return task.kind === 'read_story' ? <PrepareScreen view={view} theme={task.theme} /> : null;
    case 'waiting':
      return (
        <WaitingScreen view={view} received={'status' in task && task.status === 'submitted'} />
      );
    case 'transition':
      return <TransitionScreen />;
    case 'spectator':
      return <SpectatorScreen view={view} />;
    case 'presentation':
      return <PresentationPlaceholder />;
    default:
      return screen satisfies never;
  }
}

/**
 * Lobby → match: every creation screen, picked from the PlayerView. A player still drawing when
 * the round closes keeps the editor until their panel is sent (R42), then sees the transition.
 */
export function MatchScreen({ view, match }: { view: PlayerView; match: MatchView }) {
  const screen = screenFor(match);
  /** The drawing task of the round whose editor is open, kept through the closing. */
  const [drawing, setDrawing] = useState<DrawingTask | null>(null);
  const [sentRound, setSentRound] = useState<number | null>(null);
  const { task, roundIndex } = match;

  if (task.kind === 'draw_panel' && drawing?.roundIndex !== roundIndex) {
    // Derived state, set during render: the next render already has it.
    setDrawing({ roundIndex, theme: task.theme });
  }
  const stillSending =
    screen === 'transition' && drawing?.roundIndex === roundIndex && sentRound !== roundIndex;
  const live = (
    <p aria-live="polite" className="sr-only">
      {announcement(match)}
    </p>
  );

  if (screen === 'drawing' || stillSending) {
    return (
      <>
        {live}
        <DrawingScreen
          key={roundIndex}
          view={view}
          match={match}
          theme={task.kind === 'draw_panel' ? task.theme : (drawing?.theme ?? '')}
          hasDraft={task.kind === 'draw_panel' ? task.hasDraft : false}
          closing={stillSending}
          onSent={setSentRound}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {live}
      <MatchHeader view={view} match={match} />
      <div
        key={`${match.phase}:${String(roundIndex)}:${screen}`}
        className="motion-safe:animate-pop"
      >
        <ScreenBody view={view} match={match} screen={screen} />
      </div>
    </div>
  );
}
