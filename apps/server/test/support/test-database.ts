import { fileURLToPath } from 'node:url';

import { loadConfig } from '../../src/config/env';

/** comicle_test from docker-compose, unless DATABASE_URL_TEST says otherwise (CI). */
export const TEST_DATABASE_URL =
  loadConfig(process.env).DATABASE_URL_TEST ??
  'postgres://comicle:comicle@localhost:5432/comicle_test';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));
