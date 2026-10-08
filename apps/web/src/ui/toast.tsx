import { useEffect } from 'react';

import { strings } from '../strings/pt-BR';
import { CloseIcon } from './icons';

export const TOAST_DURATION_MS = 4000;

export type ToastTone = 'info' | 'success' | 'error';

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'bg-paper',
  success: 'bg-pop-green',
  error: 'bg-pop-red',
};

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
  durationMs?: number;
}

/** Short message at the bottom of the screen; errors interrupt (`alert`), the rest wait (`status`). */
export function Toast({
  message,
  tone = 'info',
  onDismiss,
  durationMs = TOAST_DURATION_MS,
}: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, durationMs);
    return () => {
      clearTimeout(timeout);
    };
  }, [onDismiss, durationMs, message]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-xl border-comic px-4 py-3 font-bold shadow-pop ${TONE_CLASSES[tone]}`}
      >
        <span className="flex-1">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={strings.ui.close}
          className="rounded-full p-1"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
