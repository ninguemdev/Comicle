import type { Ack, Empty } from '@comicle/shared';
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react';

import { serverNow } from '../../lib/time-sync';
import { useRoomStore, type PanelSubmitReason } from '../../stores/room-store';
import type { DrawingEditorHandle } from '../drawing/drawing-editor';

export type SubmissionStatus = 'idle' | 'sending' | 'sent';

export interface PanelSubmissionOptions {
  editor: RefObject<DrawingEditorHandle | null>;
  roundIndex: number;
  /** Server epoch ms; at 0 on the local clock the panel goes as `timeout` (protocolo §6). */
  deadlineAt: number | null;
  offsetMs: number;
  send: (
    roundIndex: number,
    reason: PanelSubmitReason,
    png: Uint8Array | null,
  ) => Promise<Ack<Empty>>;
  /** The panel is in (or a `timeout` was refused: nothing more to send). */
  onSent: (roundIndex: number) => void;
  /** A `done` that failed (the player may try again); `timeout` failures are final. */
  onError: (ack: Ack<Empty>) => void;
}

/**
 * The panel never reached the server: the socket was down, it came back (and the player re-joined)
 * while the ack was pending, or the new socket was not in the room yet.
 */
function lostOnTheWay(ack: Ack<Empty>, joinsAtSend: number): boolean {
  if (ack.ok) {
    return false;
  }
  const { connection, joins } = useRoomStore.getState();
  return connection !== 'connected' || joins !== joinsAtSend || ack.error.code === 'NOT_IN_ROOM';
}

/**
 * R40–R42: hands the panel in exactly once, whichever comes first: **Concluir**, the local timer
 * reaching 0, or `round:collect` for this round. A panel lost to a dropped connection goes again
 * as soon as the player is back in the room (T18); by then, if the round no longer takes it, the
 * screen has already moved on with the view.
 */
export function usePanelSubmission(options: PanelSubmissionOptions) {
  const { editor, roundIndex, deadlineAt, offsetMs } = options;
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  /** Locked before any `await`, so two triggers in the same tick still send once. */
  const locked = useRef(false);
  /** Lost on the way: sent again on the next `room:join`. */
  const pending = useRef<PanelSubmitReason | null>(null);

  async function send(reason: PanelSubmitReason, retry: boolean): Promise<void> {
    const joinsAtSend = useRoomStore.getState().joins;
    // R40: a blank canvas goes without an image.
    const png = (await editor.current?.exportPng()) ?? null;
    const ack = await options.send(roundIndex, reason, png);
    if (lostOnTheWay(ack, joinsAtSend)) {
      pending.current = reason;
      if (useRoomStore.getState().joins !== joinsAtSend) {
        // Already back in the room while the ack was pending.
        resend();
      }
      return;
    }
    // A retry refused by the server means the panel is in, or the round no longer takes it.
    if (ack.ok || reason === 'timeout' || retry) {
      setStatus('sent');
      options.onSent(roundIndex);
      return;
    }
    locked.current = false;
    setStatus('idle');
    options.onError(ack);
  }

  async function submit(reason: PanelSubmitReason): Promise<void> {
    if (locked.current) {
      return;
    }
    locked.current = true;
    setStatus('sending');
    await send(reason, false);
  }

  function resend(): void {
    const reason = pending.current;
    if (reason === null) {
      return;
    }
    pending.current = null;
    void send(reason, true);
  }

  const submitOnTimeout = useEffectEvent(() => {
    void submit('timeout');
  });

  useEffect(() => {
    if (deadlineAt === null) {
      return;
    }
    const delay = Math.max(0, deadlineAt - serverNow(offsetMs, Date.now()));
    const timeout = setTimeout(submitOnTimeout, delay);
    return () => {
      clearTimeout(timeout);
    };
  }, [deadlineAt, offsetMs]);

  const resendOnJoin = useEffectEvent(resend);

  // R42: only signals that arrive while this screen is open, for this round.
  useEffect(
    () =>
      useRoomStore.subscribe((state, previous) => {
        if (
          state.collect !== previous.collect &&
          state.collect?.payload.roundIndex === roundIndex
        ) {
          submitOnTimeout();
        }
        if (state.joins !== previous.joins) {
          resendOnJoin();
        }
      }),
    [roundIndex],
  );

  return {
    status,
    done: () => {
      void submit('done');
    },
  };
}
