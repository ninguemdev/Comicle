import type { Ack } from './domain/ack';
import type { ErrorCode } from './errors';

export function ok<T>(data: T): Ack<T> {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message: string): Ack<never> {
  return { ok: false, error: { code, message } };
}
