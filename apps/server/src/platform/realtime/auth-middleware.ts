import type { ExtendedError } from 'socket.io';

import type { AuthenticateToken } from '../http/require-guest';
import type { AppSocket } from './socket-types';

/** Socket.IO middleware: `handshake.auth.token` must be a valid session (protocolo §2). */
export function createSocketAuthMiddleware(authenticate: AuthenticateToken) {
  return (socket: AppSocket, next: (error?: ExtendedError) => void): void => {
    const auth: Record<string, unknown> = socket.handshake.auth;
    const token = auth.token;
    const guestId = typeof token === 'string' ? authenticate(token) : null;
    if (guestId === null) {
      // The client sees `connect_error` with this message and creates a new session (R3).
      const error: ExtendedError = new Error('UNAUTHORIZED');
      error.data = { code: 'UNAUTHORIZED' };
      next(error);
      return;
    }
    socket.data.guestId = guestId;
    next();
  };
}
