import { sql } from 'drizzle-orm';

import { createDatabase } from '../../src/platform/db/client';
import { runMigrations } from '../../src/platform/db/migrate';
import { MIGRATIONS_FOLDER, TEST_DATABASE_URL } from './test-database';

/** `pnpm test:db`: recreates the comicle_test schema from the migrations before the suite. */
export async function setup(): Promise<void> {
  const database = createDatabase(TEST_DATABASE_URL, (error) => {
    throw error;
  });
  try {
    await database.db.execute(sql`drop schema if exists drizzle cascade`);
    await database.db.execute(sql`drop schema if exists public cascade`);
    await database.db.execute(sql`create schema public`);
    await runMigrations(database.db, MIGRATIONS_FOLDER);
  } finally {
    await database.close();
  }
}
