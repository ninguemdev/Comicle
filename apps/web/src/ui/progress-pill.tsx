import { CheckIcon } from './icons';
import { strings } from '../strings/pt-BR';

export interface ProgressPillProps {
  done: number;
  total: number;
}

/** "3/5 prontos"; a polite live region, so progress changes are announced (interface.md §6). */
export function ProgressPill({ done, total }: ProgressPillProps) {
  const complete = total > 0 && done >= total;
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border-comic px-3 py-0.5 text-sm font-extrabold ${
        complete ? 'bg-pop-green' : 'bg-paper'
      }`}
    >
      {complete && <CheckIcon />}
      {strings.ui.progress.ready(done, total)}
    </span>
  );
}
