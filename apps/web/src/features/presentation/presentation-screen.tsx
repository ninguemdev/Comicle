import type { PresentationView } from '@comicle/shared';
import { useState } from 'react';

import { useOnline, useRoomStore, type PresentationAction } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { useActionError } from '../match/use-action-error';
import { HostControls } from './host-controls';
import { PresentationStage } from './presentation-stage';
import { usePresentationShortcuts } from './use-presentation-shortcuts';

const texts = strings.match.presentation;

/** Changes whenever the stage shows something else, so the reveal animation plays again. */
function stageKey(presentation: PresentationView): string {
  const { status, storyIndex, step } = presentation;
  const position = step.kind === 'panel' ? String(step.position) : '';
  return `${status}:${String(storyIndex)}:${step.kind}${position}`;
}

/**
 * R50–R56: everyone sees the step the server sent; only the host gets the controls and the
 * keyboard shortcuts, and every move goes to the server first.
 */
export function PresentationScreen({
  presentation,
  isHost,
}: {
  presentation: PresentationView;
  isHost: boolean;
}) {
  const actions = useRoomStore((state) => state.actions);
  const online = useOnline();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { report, toast } = useActionError();

  function navigate(action: PresentationAction): void {
    void actions.navigatePresentation(action).then(report);
  }

  function end(): void {
    void actions.endPresentation().then(report);
  }

  usePresentationShortcuts(isHost && online && !dialogOpen, {
    next: () => {
      navigate({ action: 'next' });
    },
    prev: () => {
      navigate({ action: 'prev' });
    },
    showFull: () => {
      navigate({ action: 'showFull' });
    },
  });

  return (
    <div className="full-screen z-30 flex flex-col gap-2 bg-paper p-2 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-3xl tracking-wide">
          {texts.storyOf(presentation.storyIndex + 1, presentation.storyCount)}
        </h1>
        {!isHost && <p className="font-bold text-muted">{texts.hostLeading}</p>}
      </header>
      <div key={stageKey(presentation)} className="min-h-0 flex-1 motion-safe:animate-pop">
        <PresentationStage
          presentation={presentation}
          isHost={isHost}
          online={online}
          onNewMatch={end}
        />
      </div>
      {isHost && (
        <HostControls
          presentation={presentation}
          online={online}
          onNavigate={navigate}
          onEnd={end}
          onDialogChange={setDialogOpen}
        />
      )}
      {toast}
    </div>
  );
}
