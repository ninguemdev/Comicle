import type { ClientToServerEvents, ServerToClientEvents } from '@comicle/shared';
import { io as ioClient, type Socket } from 'socket.io-client';

import { buildApp, type App, type AppDeps } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import { SeededRng } from '../../src/platform/random';
import { FakeClock } from './fake-clock';
import { ManualScheduler } from './manual-scheduler';

const TEST_SEED = 42;
const TEST_START_TIME = Date.UTC(2026, 0, 1);

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface TestServer extends App {
  url: string;
  clock: FakeClock;
  scheduler: ManualScheduler;
  close(): Promise<void>;
}

export interface TestServerOverrides extends Partial<Omit<AppDeps, 'clock' | 'scheduler'>> {
  scheduler?: ManualScheduler;
}

export type TestDeps = AppDeps & { clock: FakeClock; scheduler: ManualScheduler };

/** Deterministic dependencies: silent logs, fake clock, manual scheduler and seeded Rng. */
export function createTestDeps(overrides: TestServerOverrides = {}): TestDeps {
  const scheduler = overrides.scheduler ?? new ManualScheduler(new FakeClock(TEST_START_TIME));
  return {
    config: loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
    rng: new SeededRng(TEST_SEED),
    storyRepository: new InMemoryStoryRepository(),
    checkDatabase: () => Promise.resolve(),
    ...overrides,
    clock: scheduler.clock,
    scheduler,
  };
}

/** Real app on a random local port, built from `createTestDeps`. */
export async function startTestServer(overrides: TestServerOverrides = {}): Promise<TestServer> {
  const deps = createTestDeps(overrides);
  const { scheduler } = deps;
  const app = await buildApp(deps);
  await app.http.listen({ port: 0, host: '127.0.0.1' });
  const address = app.http.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Servidor de teste sem porta TCP');
  }

  return {
    ...app,
    url: `http://127.0.0.1:${String(address.port)}`,
    clock: scheduler.clock,
    scheduler,
    close: () => app.http.close(),
  };
}

/** Typed Socket.IO client, already connected (WebSocket only, no reconnection). */
export async function connectClient(url: string, token?: string): Promise<TestClient> {
  const client: TestClient = ioClient(url, {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    ...(token === undefined ? {} : { auth: { token } }),
  });
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  return client;
}
