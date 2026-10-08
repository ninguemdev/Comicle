import type { Server as HttpServer } from 'node:http';

import type { FastifyBaseLogger } from 'fastify';
import { Server } from 'socket.io';

import type { Clock } from '../clock';
import type { SocketHandler } from './define-handler';
import { SocketRateLimiter, type SocketRateLimitConfig } from './rate-limit';
import type { AppSocketServer } from './socket-types';

/** Fits PANEL_MAX_BYTES plus the event envelope (protocolo §2). */
const MAX_HTTP_BUFFER_BYTES = 3 * 1024 * 1024;

export interface SocketServerOptions {
  corsOrigins: string[];
  clock: Clock;
  log: FastifyBaseLogger;
  handlers: readonly SocketHandler[];
  rateLimits: SocketRateLimitConfig;
}

/** Socket.IO attached straight to Fastify's HTTP server (no third-party plugin). */
export function createSocketServer(
  httpServer: HttpServer,
  options: SocketServerOptions,
): AppSocketServer {
  const io: AppSocketServer = new Server(httpServer, {
    maxHttpBufferSize: MAX_HTTP_BUFFER_BYTES,
    cors: { origin: options.corsOrigins },
    serveClient: false,
  });

  io.on('connection', (socket) => {
    const connection = {
      socket,
      log: options.log.child({ socketId: socket.id }),
      rateLimiter: new SocketRateLimiter(options.rateLimits, options.clock),
    };
    for (const handler of options.handlers) {
      handler.attach(connection);
    }
  });

  return io;
}
