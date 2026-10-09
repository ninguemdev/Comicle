import { defineHandler, type SocketHandler } from '../../platform/realtime/define-handler';
import type { MatchService } from '../matches/match.service';

/**
 * `presentation:*` (protocolo §3): validate, delegate, answer. The presentation is the last
 * phase of the match, so the match service runs it.
 */
export function presentationHandlers(service: MatchService): SocketHandler[] {
  return [
    defineHandler('presentation:navigate', (action, { socket }) =>
      service.navigatePresentation(socket.id, action),
    ),
    defineHandler('presentation:end', (_payload, { socket }) => service.endPresentation(socket.id)),
  ];
}
