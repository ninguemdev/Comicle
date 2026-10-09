import { defineHandler, type SocketHandler } from '../../platform/realtime/define-handler';
import type { MatchService } from './match.service';

/** `match:*` and `theme:*` (protocolo §3): validate, delegate, answer. */
export function matchHandlers(service: MatchService): SocketHandler[] {
  return [
    defineHandler('match:start', (_payload, { socket }) => service.start(socket.id)),
    defineHandler('match:abort', (_payload, { socket }) => service.abort(socket.id)),
    defineHandler('theme:draft', ({ text }, { socket }) => service.draftTheme(socket.id, text)),
    defineHandler('theme:submit', ({ text }, { socket }) => service.submitTheme(socket.id, text)),
  ];
}
