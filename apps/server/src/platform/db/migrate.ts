import { migrate } from 'drizzle-orm/node-postgres/migrator';

import type { Db } from './client';

/** Applies the generated SQL migrations (apps/server/drizzle) that are still pending. */
export async function runMigrations(db: Db, migrationsFolder: string): Promise<void> {
  await migrate(db, { migrationsFolder });
}
