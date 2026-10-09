import { useState } from 'react';

import { useOnline, useRoomStore } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { useActionError } from './use-action-error';

const texts = strings.match;

/** R57: the host ends the match, after confirming; discreet so nobody hits it by accident. */
export function AbortMatchButton() {
  const actions = useRoomStore((state) => state.actions);
  const online = useOnline();
  const [confirming, setConfirming] = useState(false);
  const { report, toast } = useActionError();

  async function confirm(): Promise<void> {
    setConfirming(false);
    report(await actions.abortMatch());
  }

  return (
    <>
      <Button
        variant="ghost"
        className="min-h-0 px-2 py-1 text-sm"
        disabled={!online}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {texts.abort}
      </Button>
      <Dialog
        open={confirming}
        title={texts.abortTitle}
        onClose={() => {
          setConfirming(false);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(false);
              }}
            >
              {texts.cancel}
            </Button>
            <Button variant="danger" disabled={!online} onClick={() => void confirm()}>
              {texts.abortConfirm}
            </Button>
          </>
        }
      >
        <p>{texts.abortBody}</p>
      </Dialog>
      {toast}
    </>
  );
}
