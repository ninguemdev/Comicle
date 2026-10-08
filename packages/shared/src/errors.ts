/** Error codes shared by HTTP and realtime (docs/protocolo-realtime.md §2). */
export const ErrorCode = {
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_CLOSED: 'ROOM_CLOSED',
  KICKED: 'KICKED',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  NOT_HOST: 'NOT_HOST',
  INVALID_STATE: 'INVALID_STATE',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  DEADLINE_PASSED: 'DEADLINE_PASSED',
  IMAGE_INVALID: 'IMAGE_INVALID',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const errorCodes: ReadonlySet<string> = new Set(Object.values(ErrorCode));

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && errorCodes.has(value);
}
