import type { PresentationView } from '@comicle/shared';
import { useState } from 'react';

import type { PresentationAction } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';

// The host's bar at the bottom of the presentation (interface.md §5, R52).

const texts = strings.match.presentation;
const cancel = strings.match.cancel;

const SMALL = 'min-h-10 px-3 py-1 text-sm';

type OpenDialog = 'stories' | 'end' | null;

export interface HostControlsProps {
  presentation: PresentationView;
  onNavigate: (action: PresentationAction) => void;
  onEnd: () => void;
  /** A dialog is open: the page shortcuts must wait. */
  onDialogChange: (open: boolean) => void;
}

export function HostControls({
  presentation,
  onNavigate,
  onEnd,
  onDialogChange,
}: HostControlsProps) {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { status, storyIndex, step } = presentation;
  const finished = status === 'finished';
  // D29: these would not move the cursor, so they are not offered.
  const atStart = !finished && storyIndex === 0 && step.kind === 'theme';
  const atFull = !finished && step.kind === 'full';

  function open(next: OpenDialog): void {
    setDialog(next);
    onDialogChange(next !== null);
  }

  function goTo(index: number): void {
    open(null);
    onNavigate({ action: 'goToStory', storyIndex: index });
  }

  function end(): void {
    open(null);
    onEnd();
  }

  return (
    <nav
      aria-label={texts.controls}
      className="flex flex-wrap items-center justify-center gap-2 border-t-3 border-ink pt-2"
    >
      <Button
        variant="secondary"
        className={SMALL}
        disabled={atStart}
        onClick={() => {
          onNavigate({ action: 'prev' });
        }}
      >
        {texts.prev}
      </Button>
      <Button
        className="min-h-10 px-4 py-1"
        disabled={finished}
        onClick={() => {
          onNavigate({ action: 'next' });
        }}
      >
        {texts.next}
      </Button>
      <Button
        variant="secondary"
        className={SMALL}
        disabled={finished || atFull}
        onClick={() => {
          onNavigate({ action: 'showFull' });
        }}
      >
        {texts.showFull}
      </Button>
      <Button
        variant="secondary"
        className={SMALL}
        disabled={finished}
        onClick={() => {
          onNavigate({ action: 'nextStory' });
        }}
      >
        {texts.nextStory}
      </Button>
      <Button
        variant="secondary"
        className={SMALL}
        aria-haspopup="dialog"
        onClick={() => {
          open('stories');
        }}
      >
        {texts.stories}
      </Button>
      <Button
        variant="ghost"
        className={SMALL}
        onClick={() => {
          // At the end there is nothing left to miss; before it, the host confirms.
          if (finished) {
            onEnd();
          } else {
            open('end');
          }
        }}
      >
        {texts.end}
      </Button>
      <p className="hidden w-full text-center text-xs text-muted sm:block">{texts.shortcuts}</p>

      <Dialog
        open={dialog === 'stories'}
        title={texts.storiesTitle}
        onClose={() => {
          open(null);
        }}
      >
        <ul className="flex flex-col gap-2">
          {presentation.reachedStories.map((story) => (
            <li key={story.index}>
              <Button
                variant="secondary"
                className="w-full justify-start text-left"
                aria-current={!finished && story.index === storyIndex ? 'true' : undefined}
                onClick={() => {
                  goTo(story.index);
                }}
              >
                <span className="min-w-0 break-words">
                  {texts.storyItem(story.index + 1, story.themeText)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={dialog === 'end'}
        title={texts.endTitle}
        onClose={() => {
          open(null);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                open(null);
              }}
            >
              {cancel}
            </Button>
            <Button variant="danger" onClick={end}>
              {texts.endConfirm}
            </Button>
          </>
        }
      >
        <p>{texts.endBody}</p>
      </Dialog>
    </nav>
  );
}
