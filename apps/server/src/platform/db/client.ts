import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

export interface Database {
  db: Db;
  /** Throws when the database does not answer (used by `/healthz`). */
  ping: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * `onIdleError` receives errors of idle pooled connections (database restarted, network drop).
 * Without a listener, pg emits them as an unhandled 'error' event and the process dies.
 */
export function createDatabase(
  connectionString: string,
  onIdleError: (error: Error) => void,
): Database {
  const pool = new Pool({ connectionString });
  pool.on('error', onIdleError);
  const db = drizzle(pool, { schema });
  return {
    db,
    ping: async () => {
      await db.execute(sql`select 1`);
    },
    close: () => pool.end(),
  };
}
