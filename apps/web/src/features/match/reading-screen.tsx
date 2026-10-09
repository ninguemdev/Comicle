import type { PanelRef } from '@comicle/shared';
import { useState } from 'react';

import { useOnline, useRoomStore } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { ComicPage } from '../comic/comic-page';
import { ThemeLine } from './theme-line';
import { useActionError } from './use-action-error';

const texts = strings.match;

/** R36: the theme and every earlier panel of the story, until the player starts drawing. */
export function ReadingScreen({
  theme,
  panels,
  roundIndex,
}: {
  theme: string;
  panels: readonly PanelRef[];
  roundIndex: number;
}) {
  const actions = useRoomStore((state) => state.actions);
  const online = useOnline();
  const [sending, setSending] = useState(false);
  const { report, toast } = useActionError();

  async function start(): Promise<void> {
    setSending(true);
    if (!report(await actions.confirmReading(roundIndex))) {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ThemeLine theme={theme} />
      <div className="h-[55dvh] min-h-64">
        <ComicPage panels={panels} />
      </div>
      <p className="font-bold">{texts.reading.warning}</p>
      <Button onClick={() => void start()} disabled={sending || !online} className="self-end">
        {texts.reading.start}
      </Button>
      {toast}
    </div>
  );
}
