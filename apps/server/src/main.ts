import type { FastifyBaseLogger } from 'fastify';

import { buildApp } from './app';
import { ConfigError, loadConfig } from './config/env';
import { SystemClock } from './platform/clock';
import { cryptoRng } from './platform/random';
import { TimerScheduler } from './platform/scheduler';

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

const { http } = await buildApp({ config, clock, scheduler, rng: cryptoRng });
logRef.log = http.log;

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  http.log.info({ signal }, 'shutting down');
  scheduler.cancelAll();
  // Closes Socket.IO too (hooks in buildApp); the database joins in T04.
  await http.close();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal));
}

await http.listen({ port: config.PORT, host: config.HOST });
