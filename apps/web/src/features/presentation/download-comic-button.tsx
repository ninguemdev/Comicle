import type { PresentationView } from '@comicle/shared';
import { useEffect, useRef, useState } from 'react';

import { saveFile } from '../../lib/save-file';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { DownloadIcon } from '../../ui/icons';
import { comicFileName, exportComicPng } from '../comic/comic-export';
import { usePanelImageLoader } from '../comic/use-panel-image';

const texts = strings.match.presentation;

type DownloadState = 'idle' | 'working' | 'failed';

export interface DownloadComicButtonProps {
  story: PresentationView['story'];
  /** 1-based, for the file name. */
  storyNumber: number;
}

/**
 * "Baixar HQ" (interface.md §5): the story on screen as one PNG, made in the browser from the
 * panels this player may already see (R54); nothing new comes from the server.
 */
export function DownloadComicButton({ story, storyNumber }: DownloadComicButtonProps) {
  const loader = usePanelImageLoader();
  const [state, setState] = useState<DownloadState>('idle');
  const running = useRef<AbortController | null>(null);

  // Leaving the view (next step, another story) drops a download still on its way.
  useEffect(
    () => () => {
      running.current?.abort();
    },
    [],
  );

  async function download(): Promise<void> {
    if (loader === null) {
      return;
    }
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setState('working');
    try {
      const png = await exportComicPng(
        { theme: story.theme, panels: story.revealedPanels },
        loader,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        saveFile(png, comicFileName(story.theme.text, storyNumber));
        setState('idle');
      }
    } catch {
      if (!controller.signal.aborted) {
        setState('failed');
      }
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        disabled={loader === null || state === 'working'}
        onClick={() => {
          void download();
        }}
      >
        <DownloadIcon />
        {state === 'working' ? texts.downloading : texts.download}
      </Button>
      {state === 'failed' && (
        <p role="alert" className="text-sm text-muted">
          {texts.downloadFailed}
        </p>
      )}
    </div>
  );
}
