import { configDefaults, defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'server',
    environment: 'node',
    // Tests against a real PostgreSQL run only via `pnpm test:db`.
    exclude: [...configDefaults.exclude, '**/*.db.test.ts'],
  },
});
