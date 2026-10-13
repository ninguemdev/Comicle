import type { Ack, Empty } from '@comicle/shared';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { serverNow } from '../../lib/time-sync';
import { useRoomStore, type PanelSubmitReason } from '../../stores/room-store';

export type SubmissionStatus = 'idle' | 'sending' | 'sent';

export interface PanelSubmissionOptions {
  /** Panels the player draws this round (R66); 1 in the collaborative mode. */
  panelCount: number;
  /** Panel `k` as a PNG, or `null` for a blank canvas (R40). */
  exportPanel: (panelIndex: number) => Promise<Uint8Array | null>;
  roundIndex: number;
  /** Server epoch ms; at 0 on the local clock the panels go as `timeout` (protocolo §6). */
  deadlineAt: number | null;
  offsetMs: number;
  send: (
    roundIndex: number,
    panelIndex: number,
    reason: PanelSubmitReason,
    png: Uint8Array | null,
  ) => Promise<Ack<Empty>>;
  /** Every panel is in (or a `timeout` was refused: nothing more to send). */
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
 * R40–R42, R66: hands every panel in exactly once, whichever comes first: **Concluir**, the local
 * timer reaching 0, or `round:collect` for this round. Panels go one `panel:submit` each, in
 * order; the ones the server took are never sent again. Whatever was lost to a dropped connection
 * goes again as soon as the player is back in the room (T18); by then, if the round no longer
 * takes it, the screen has already moved on with the view.
 */
export function usePanelSubmission(options: PanelSubmissionOptions) {
  const { roundIndex, deadlineAt, offsetMs } = options;
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  /** Locked before any `await`, so two triggers in the same tick still send once. */
  const locked = useRef(false);
  /** Lost on the way: sent again on the next `room:join`. */
  const pending = useRef<PanelSubmitReason | null>(null);
  /** Panels already in. */
  const delivered = useRef(new Set<number>());

  async function send(reason: PanelSubmitReason, retry: boolean): Promise<void> {
    for (let panelIndex = 0; panelIndex < options.panelCount; panelIndex++) {
      if (delivered.current.has(panelIndex)) {
        continue;
      }
      const joinsAtSend = useRoomStore.getState().joins;
      const png = await options.exportPanel(panelIndex);
      const ack = await options.send(roundIndex, panelIndex, reason, png);
      if (lostOnTheWay(ack, joinsAtSend)) {
        pending.current = reason;
        if (useRoomStore.getState().joins !== joinsAtSend) {
          // Already back in the room while the ack was pending.
          resend();
        }
        return;
      }
      // A retry refused by the server means the panel is in, or the round no longer takes it.
      if (!ack.ok && reason === 'done' && !retry) {
        locked.current = false;
        setStatus('idle');
        options.onError(ack);
        return;
      }
      delivered.current.add(panelIndex);
    }
    setStatus('sent');
    options.onSent(roundIndex);
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
