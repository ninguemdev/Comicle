import type { PanelRef, PresentationView } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';
import { AvatarRenderer } from '../avatar/avatar-renderer';
import { ComicPage } from '../comic/comic-page';
import { PanelFrame } from '../comic/panel-frame';

// The main area of the presentation (interface.md §5): one view per step of the cursor.

const texts = strings.match.presentation;

/** Width of a thumbnail in the strip of revealed panels, in CSS px. */
const THUMBNAIL_WIDTH = 96;

type Story = PresentationView['story'];

/** `theme`: the premise in a giant balloon, with whoever wrote it (R55). */
function ThemeView({ story }: { story: Story }) {
  const { text, author } = story.theme;
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 overflow-y-auto p-4">
      <SpeechBubble className="max-w-2xl">
        <p className="font-display text-4xl leading-tight tracking-wide break-words sm:text-6xl">
          {text}
        </p>
      </SpeechBubble>
      <div className="flex flex-col items-center gap-2">
        <AvatarRenderer avatar={author.avatar} size={160} />
        <p className="text-xl font-bold">{texts.themeBy(author.nickname)}</p>
      </div>
    </div>
  );
}

/** Strip of every revealed panel, the one on stage highlighted. */
function RevealedStrip({ panels, current }: { panels: readonly PanelRef[]; current: number }) {
  return (
    <ul aria-label={texts.revealed} className="flex shrink-0 gap-2 overflow-x-auto p-1">
      {panels.map((panel) => (
        <li
          key={panel.panelId}
          aria-current={panel.position === current ? 'step' : undefined}
          className={
            panel.position === current
              ? 'rounded outline-4 outline-offset-2 outline-pop-yellow'
              : 'opacity-70'
          }
        >
          <PanelFrame panel={panel} width={THUMBNAIL_WIDTH} compact />
        </li>
      ))}
    </ul>
  );
}

/** `panel(k)`: panel `k` as large as fits, with its artist; the revealed ones below. */
function PanelView({ story, position }: { story: Story; position: number }) {
  const panel = story.revealedPanels.find((revealed) => revealed.position === position);
  return (
    <div className="flex size-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        {panel && <ComicPage key={panel.panelId} panels={[panel]} maxColumns={1} showCredits />}
      </div>
      <RevealedStrip panels={story.revealedPanels} current={position} />
    </div>
  );
}

/** `full`: the whole story as a comic page with credits — the main view of the result. */
function FullView({ story }: { story: Story }) {
  return (
    <div className="flex size-full flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="rounded-md border-2 border-ink bg-pop-yellow px-2 font-display text-lg tracking-wide">
          {texts.full}
        </span>
        <h2 className="font-display text-2xl tracking-wide break-words sm:text-3xl">
          {story.theme.text}
        </h2>
        <p className="text-muted">{texts.themeBy(story.theme.author.nickname)}</p>
      </div>
      <div className="min-h-0 flex-1">
        <ComicPage panels={story.revealedPanels} showCredits />
      </div>
    </div>
  );
}

/** `finished`: the end, and for the host the way back to the lobby (R56). */
function FinishedView({
  isHost,
  online,
  onNewMatch,
}: {
  isHost: boolean;
  online: boolean;
  onNewMatch: () => void;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 p-4 text-center">
      <h2 className="font-display text-6xl tracking-wide sm:text-8xl">{texts.finished}</h2>
      {isHost ? (
        <Button onClick={onNewMatch} disabled={!online}>
          {texts.newMatch}
        </Button>
      ) : (
        <SpeechBubble>{texts.finishedWaiting}</SpeechBubble>
      )}
    </div>
  );
}

export interface PresentationStageProps {
  presentation: PresentationView;
  isHost: boolean;
  /** Offline, the way back to the lobby waits for the connection. */
  online: boolean;
  onNewMatch: () => void;
}

export function PresentationStage({
  presentation,
  isHost,
  online,
  onNewMatch,
}: PresentationStageProps) {
  if (presentation.status === 'finished') {
    return <FinishedView isHost={isHost} online={online} onNewMatch={onNewMatch} />;
  }
  const { story, step } = presentation;
  switch (step.kind) {
    case 'theme':
      return <ThemeView story={story} />;
    case 'panel':
      return <PanelView story={story} position={step.position} />;
    case 'full':
      return <FullView story={story} />;
    default:
      return step satisfies never;
  }
}
