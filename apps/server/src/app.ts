import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { HEALTH_OK, type HealthResponse, type Rng } from '@comicle/shared';
import Fastify, { type FastifyInstance } from 'fastify';

import type { AppConfig } from './config/env';
import { timeSyncHandlers } from './modules/timing/time-sync.handlers';
import type { Clock } from './platform/clock';
import { registerErrorHandler } from './platform/http/error-handler';
import type { SocketHandler } from './platform/realtime/define-handler';
import {
  DEFAULT_SOCKET_RATE_LIMITS,
  type SocketRateLimitConfig,
} from './platform/realtime/rate-limit';
import { createSocketServer } from './platform/realtime/socket-server';
import type { AppSocketServer } from './platform/realtime/socket-types';
import type { Scheduler } from './platform/scheduler';

/** Everything the app needs comes from here: buildApp never reads process.env or the global clock. */
export interface AppDeps {
  config: AppConfig;
  clock: Clock;
  scheduler: Scheduler;
  rng: Rng;
  /** Handlers on top of the modules' own (tests register test-only events here). */
  extraSocketHandlers?: readonly SocketHandler[];
  socketRateLimits?: SocketRateLimitConfig;
}

export interface App {
  http: FastifyInstance;
  io: AppSocketServer;
}

// Never log tokens or images (AGENTS.md, Logs).
const REDACTED_PATHS = [
  'req.headers.authorization',
  'authorization',
  '*.authorization',
  'token',
  '*.token',
  'png',
  '*.png',
];

export async function buildApp(deps: AppDeps): Promise<App> {
  const { config, clock } = deps;
  const http = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: REDACTED_PATHS,
      ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
    },
    trustProxy: config.TRUST_PROXY,
  });

  await http.register(helmet);
  await http.register(cors, { origin: config.CORS_ORIGINS });
  // Routes opt in with `config.rateLimit` (sessions, room lookup).
  await http.register(rateLimit, { global: false });
  registerErrorHandler(http);

  http.get('/healthz', (): HealthResponse => HEALTH_OK);

  // Hooks must exist before ready(); the socket server only after it.
  const socketRef: { io?: AppSocketServer } = {};
  http.addHook('preClose', () => {
    socketRef.io?.local.disconnectSockets(true);
    return Promise.resolve();
  });
  http.addHook('onClose', async () => {
    await socketRef.io?.close();
  });

  await http.ready();
  const io = createSocketServer(http.server, {
    corsOrigins: config.CORS_ORIGINS,
    clock,
    log: http.log,
    handlers: [...timeSyncHandlers(clock), ...(deps.extraSocketHandlers ?? [])],
    rateLimits: deps.socketRateLimits ?? DEFAULT_SOCKET_RATE_LIMITS,
  });
  socketRef.io = io;

  return { http, io };
}
