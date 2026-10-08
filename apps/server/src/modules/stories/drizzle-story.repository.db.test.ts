import { afterAll } from 'vitest';

import { TEST_DATABASE_URL } from '../../../test/support/test-database';
import { createDatabase } from '../../platform/db/client';
import { rooms } from '../../platform/db/schema';
import { DrizzleStoryRepository } from './drizzle-story.repository';
import { runStoryRepositoryContract } from './story-repository.contract';

const database = createDatabase(TEST_DATABASE_URL, (error) => {
  throw error;
});

afterAll(async () => {
  await database.close();
});

runStoryRepositoryContract(() => ({
  repository: new DrizzleStoryRepository(database.db),
  // Deleting the rooms cascades to everything else.
  reset: async () => {
    await database.db.delete(rooms);
  },
}));
