import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Rng } from '@comicle/shared';
import Fastify, { type FastifyInstance } from 'fastify';

import type { AppConfig } from './config/env';
import { registerDrawingRoutes } from './modules/drawing/drawing.routes';
import { DrawingService } from './modules/drawing/drawing.service';
import { matchHandlers } from './modules/matches/match.handlers';
import { MatchService } from './modules/matches/match.service';
import { presentationHandlers } from './modules/presentation/presentation.handlers';
import { registerGuestIdentityRoutes } from './modules/guest-identity/guest-identity.routes';
import { GuestSessionStore } from './modules/guest-identity/session-store';
import { createSocketBroadcaster, roomHandlers } from './modules/rooms/room.handlers';
import { RoomRegistry } from './modules/rooms/room-registry';
import { registerRoomRoutes } from './modules/rooms/room.routes';
import { RoomService } from './modules/rooms/room.service';
import type { StoryRepository } from './modules/stories/story-repository';
import type { GameTimingConfig } from './modules/timing/game-timing';
import { timeSyncHandlers } from './modules/timing/time-sync.handlers';
import { createRoomPublisher } from './modules/views/room-publisher';
import type { Clock } from './platform/clock';
import { registerErrorHandler } from './platform/http/error-handler';
import { registerHealthRoute } from './platform/http/health.routes';
import { createRequireGuest } from './platform/http/require-guest';
import { newId, newSessionToken } from './platform/ids';
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
  storyRepository: StoryRepository;
  /** Durations of rooms and matches (`gameTimingFor(config.GAME_TIMING_PROFILE)` in production). */
  timing: GameTimingConfig;
  /** Throws when the database is unreachable (`/healthz`). */
  checkDatabase: () => Promise<void>;
  socketRateLimits?: SocketRateLimitConfig;
  /** Where pino writes (tests capture logs here); stdout by default. */
  logDestination?: { write(line: string): void };
}

export interface App {
  http: FastifyInstance;
  io: AppSocketServer;
  guestSessions: GuestSessionStore;
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
      ...(deps.logDestination ? { stream: deps.logDestination } : {}),
    },
    trustProxy: config.TRUST_PROXY,
  });

  await http.register(helmet);
  await http.register(cors, { origin: config.CORS_ORIGINS });
  // Routes opt in with `config.rateLimit` (sessions, room lookup).
  await http.register(rateLimit, { global: false });
  registerErrorHandler(http);

  registerHealthRoute(http, deps.checkDatabase);

  const guestSessions = new GuestSessionStore({
    clock,
    scheduler: deps.scheduler,
    newToken: newSessionToken,
    newId,
  });
  guestSessions.startSweeping();
  const authenticate = (token: string) => guestSessions.authenticate(token);
  http.decorateRequest('guestId', '');
  const requireGuest = createRequireGuest(authenticate);
  registerGuestIdentityRoutes(http, guestSessions, requireGuest);

  const rooms = new RoomRegistry();
  registerRoomRoutes(http, rooms);
  registerDrawingRoutes(
    http,
    new DrawingService({ registry: rooms, storyRepository: deps.storyRepository }),
    requireGuest,
  );

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
  const broadcaster = createSocketBroadcaster(() => {
    if (!socketRef.io) {
      throw new Error('Socket.IO ainda não foi criado');
    }
    return socketRef.io;
  });
  const publish = createRoomPublisher(clock, broadcaster);
  const roomService = new RoomService({
    clock,
    scheduler: deps.scheduler,
    rng: deps.rng,
    newId,
    storyRepository: deps.storyRepository,
    timing: deps.timing,
    registry: rooms,
    broadcaster,
    publish,
    // The match service is created right below; it exists by the time anyone connects.
    onPresenceChange: (room) => matchService.handlePresenceChange(room),
    log: http.log,
  });
  const matchService = new MatchService({
    clock,
    scheduler: deps.scheduler,
    rng: deps.rng,
    newId,
    storyRepository: deps.storyRepository,
    timing: deps.timing,
    registry: rooms,
    broadcaster,
    publish,
    onReturnToLobby: (room) => {
      roomService.scheduleLobbyRemovals(room);
    },
    log: http.log,
  });
  const io = createSocketServer(http.server, {
    corsOrigins: config.CORS_ORIGINS,
    clock,
    log: http.log,
    handlers: [
      ...timeSyncHandlers(clock),
      ...roomHandlers(roomService),
      ...matchHandlers(matchService),
      ...presentationHandlers(matchService),
    ],
    onDisconnect: ({ socket }) => roomService.handleDisconnect(socket.id),
    rateLimits: deps.socketRateLimits ?? DEFAULT_SOCKET_RATE_LIMITS,
    trustProxy: config.TRUST_PROXY,
    authenticate,
  });
  socketRef.io = io;

  return { http, io, guestSessions };
}
