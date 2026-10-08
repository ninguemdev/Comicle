import { strings } from '../strings/pt-BR';
import { Button } from './button';

export type BannerStatus = 'reconnecting' | 'offline';

export interface ConnectionBannerProps {
  /** `null` hides the banner; the live region stays mounted so changes are announced. */
  status: BannerStatus | null;
  onRetry?: () => void;
}

/** Strip at the top of the page; connection problems never replace the screen (interface.md §2). */
export function ConnectionBanner({ status, onRetry }: ConnectionBannerProps) {
  return (
    <div role="status" className="sticky top-0 z-40">
      {status !== null && (
        <div
          className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b-3 border-ink px-4 py-2 text-center font-bold ${
            status === 'offline' ? 'bg-pop-red' : 'bg-pop-yellow'
          }`}
        >
          <span>
            {status === 'offline' ? strings.connection.offline : strings.connection.reconnecting}
          </span>
          {status === 'offline' && onRetry !== undefined && (
            <Button variant="ghost" className="min-h-0 px-1 py-0" onClick={onRetry}>
              {strings.connection.retry}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
