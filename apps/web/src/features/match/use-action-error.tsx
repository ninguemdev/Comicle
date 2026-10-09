import type { Ack } from '@comicle/shared';
import { useCallback, useState, type ReactNode } from 'react';

import { errorMessages } from '../../strings/pt-BR';
import { Toast } from '../../ui/toast';

/** A failed action becomes a toast with the text of its error code (protocolo §2). */
export function useActionError(): { report: (ack: Ack<unknown>) => boolean; toast: ReactNode } {
  const [message, setMessage] = useState<string | null>(null);
  const dismiss = useCallback(() => {
    setMessage(null);
  }, []);
  const report = useCallback((ack: Ack<unknown>) => {
    if (ack.ok) {
      return true;
    }
    setMessage(errorMessages[ack.error.code]);
    return false;
  }, []);
  return {
    report,
    toast: message === null ? null : <Toast message={message} tone="error" onDismiss={dismiss} />,
  };
}
