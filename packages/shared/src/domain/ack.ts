import type { ErrorCode } from '../errors';

export interface ErrorBody {
  code: ErrorCode;
  /** pt-BR; the client picks the final text from `code`. */
  message: string;
}

/** Response to every client event (docs/protocolo-realtime.md §2). */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: ErrorBody };

/** Payload or ack data of events that carry nothing. */
export type Empty = Record<string, never>;
