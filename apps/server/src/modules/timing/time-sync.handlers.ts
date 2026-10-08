import type { Clock } from '../../platform/clock';
import { defineHandler, type SocketHandler } from '../../platform/realtime/define-handler';

/** R61: the client estimates its clock offset from `serverNow` (protocolo §6). */
export function timeSyncHandlers(clock: Clock): SocketHandler[] {
  return [
    defineHandler('time:sync', ({ clientSentAt }) => ({ clientSentAt, serverNow: clock.now() })),
  ];
}
