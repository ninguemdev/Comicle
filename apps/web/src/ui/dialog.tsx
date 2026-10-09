import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { strings } from '../strings/pt-BR';
import { CloseIcon } from './icons';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/** Keeps Tab and Shift+Tab cycling inside the dialog. */
function trapFocus(event: KeyboardEvent<HTMLElement>, container: HTMLElement): void {
  const focusable = focusableIn(container);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons at the bottom, such as cancel and confirm. */
  actions?: ReactNode;
}

/** Modal with focus trapped inside, `Esc` to close and focus returned to the trigger. */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel !== null) {
      (focusableIn(panel)[0] ?? panel).focus();
    }
    return () => {
      trigger?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    } else if (event.key === 'Tab' && panelRef.current !== null) {
      trapFocus(event, panelRef.current);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex max-h-full w-full max-w-md animate-pop flex-col gap-4 overflow-y-auto rounded-xl border-comic bg-paper p-5 shadow-pop"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-3xl tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.ui.close}
            className="-mt-1 -mr-1 rounded-full p-2 hover:bg-pop-yellow"
          >
            <CloseIcon />
          </button>
        </div>
        <div>{children}</div>
        {actions !== undefined && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{actions}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
