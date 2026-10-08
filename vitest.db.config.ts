import { configDefaults, defineConfig } from 'vitest/config';

// Repository tests that need a real PostgreSQL (DATABASE_URL_TEST); `pnpm test` excludes them.
export default defineConfig({
  test: {
    include: ['apps/server/**/*.db.test.ts'],
    exclude: [...configDefaults.exclude],
    environment: 'node',
  },
});
