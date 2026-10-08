import { fileURLToPath } from 'node:url';

import type { FastifyBaseLogger } from 'fastify';

import { buildApp } from './app';
import { ConfigError, loadConfig } from './config/env';
import { DrizzleStoryRepository } from './modules/stories/drizzle-story.repository';
import { SystemClock } from './platform/clock';
import { createDatabase } from './platform/db/client';
import { runMigrations } from './platform/db/migrate';
import { cryptoRng } from './platform/random';
import { TimerScheduler } from './platform/scheduler';

// apps/server/drizzle, from both src/main.ts (dev) and dist/main.mjs (build).
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

function readConfig() {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const config = readConfig();
const clock = new SystemClock();
// The logger only exists after buildApp; no timer can fire before that.
const logRef: { log?: FastifyBaseLogger } = {};
const scheduler = new TimerScheduler(clock, (error, key) => {
  logRef.log?.error({ err: error, key }, 'scheduled task failed');
});

const database = createDatabase(config.DATABASE_URL, (error) => {
  logRef.log?.error({ err: error }, 'idle database connection failed');
});
await runMigrations(database.db, MIGRATIONS_FOLDER);
const storyRepository = new DrizzleStoryRepository(database.db);

const { http } = await buildApp({
  config,
  clock,
  scheduler,
  rng: cryptoRng,
  storyRepository,
  checkDatabase: database.ping,
});
logRef.log = http.log;

// R17: live room state did not survive the restart, so neither does their content.
const removedRooms = await storyRepository.deleteAllOpenRooms();
http.log.info({ removedRooms }, 'open rooms removed on boot');

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  http.log.info({ signal }, 'shutting down');
  scheduler.cancelAll();
  // Closes Socket.IO too (hooks in buildApp).
  await http.close();
  await database.close();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal));
}

await http.listen({ port: config.PORT, host: config.HOST });
