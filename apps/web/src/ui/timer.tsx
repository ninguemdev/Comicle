import { useEffect, useState } from 'react';

import { serverNow } from '../lib/time-sync';
import { strings } from '../strings/pt-BR';

/** Seconds announced to screen readers besides the end (interface.md §6). */
const ANNOUNCED_SECONDS = [30, 10] as const;
/** At or below this, the timer turns red. */
const URGENT_SECONDS = 10;
const TICK_MS = 250;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** Whole seconds left, rounded up so 0 only shows once time is really over; never negative. */
export function secondsLeft(deadlineAt: number, offsetMs: number, localNow = Date.now()): number {
  const remainingMs = deadlineAt - serverNow(offsetMs, localNow);
  return Math.max(0, Math.ceil(remainingMs / MS_PER_SECOND));
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

/** Announcement when going from `previous` to `current` seconds crosses a milestone. */
function milestoneAnnouncement(previous: number, current: number): string | null {
  if (current === 0) {
    return previous > 0 ? strings.ui.timer.timeUp : null;
  }
  const crossed = ANNOUNCED_SECONDS.find((mark) => previous > mark && current <= mark);
  return crossed === undefined ? null : strings.ui.timer.secondsLeft(crossed);
}

export interface TimerProps {
  /** Server epoch ms (`phaseDeadlineAt`). */
  deadlineAt: number;
  /** Server clock minus local clock (protocolo §6). */
  offsetMs: number;
}

/** Countdown to a server deadline: the visible clock is silent; milestones go to `aria-live`. */
export function Timer({ deadlineAt, offsetMs }: TimerProps) {
  const [now, setNow] = useState(() => Date.now());
  // Tied to its deadline, so a new phase never shows the previous phase's announcement.
  const [announcement, setAnnouncement] = useState<{ deadlineAt: number; text: string } | null>(
    null,
  );

  useEffect(() => {
    let previous = secondsLeft(deadlineAt, offsetMs);
    const interval = setInterval(() => {
      const tick = Date.now();
      const current = secondsLeft(deadlineAt, offsetMs, tick);
      const text = milestoneAnnouncement(previous, current);
      if (text !== null) {
        setAnnouncement({ deadlineAt, text });
      }
      previous = current;
      setNow(tick);
    }, TICK_MS);
    return () => {
      clearInterval(interval);
    };
  }, [deadlineAt, offsetMs]);

  const seconds = secondsLeft(deadlineAt, offsetMs, now);
  const urgent = seconds <= URGENT_SECONDS;
  return (
    <div className="inline-flex items-center">
      <span className="sr-only">{strings.ui.timer.label}</span>
      <span
        role="timer"
        className={`min-w-[4.5ch] rounded-lg border-comic px-3 py-1 text-center font-display text-3xl tracking-wider tabular-nums shadow-pop ${
          urgent ? 'bg-pop-red motion-safe:animate-pulse' : 'bg-paper'
        }`}
      >
        {formatClock(seconds)}
      </span>
      <span aria-live="polite" className="sr-only">
        {announcement?.deadlineAt === deadlineAt ? announcement.text : ''}
      </span>
    </div>
  );
}
