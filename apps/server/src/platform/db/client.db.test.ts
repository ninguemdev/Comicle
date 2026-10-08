import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_DATABASE_URL } from '../../../test/support/test-database';
import { createDatabase, type Database } from './client';

describe('createDatabase', () => {
  const opened: Database[] = [];

  afterEach(async () => {
    await Promise.all(opened.splice(0).map((database) => database.close()));
  });

  function open(onIdleError: (error: Error) => void = () => undefined): Database {
    const database = createDatabase(TEST_DATABASE_URL, onIdleError);
    opened.push(database);
    return database;
  }

  it('ping responde com o banco no ar', async () => {
    await expect(open().ping()).resolves.toBeUndefined();
  });

  it('conexão ociosa derrubada vai para onIdleError em vez de matar o processo', async () => {
    const onIdleError = vi.fn();
    const database = open(onIdleError);
    const { rows } = await database.db.execute<{ pid: number }>(
      sql`select pg_backend_pid() as pid`,
    );
    const pid = rows[0]?.pid;

    await open().db.execute(sql`select pg_terminate_backend(${pid})`);

    await vi.waitFor(() => {
      expect(onIdleError).toHaveBeenCalled();
    });
    await expect(database.ping()).resolves.toBeUndefined();
  });
});
