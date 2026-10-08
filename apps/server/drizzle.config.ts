import { existsSync } from 'node:fs';

import { defineConfig } from 'drizzle-kit';

import { loadConfig } from './src/config/env';

// drizzle-kit does not read .env by itself; same defaults as the server otherwise.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/platform/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: loadConfig(process.env).DATABASE_URL },
});
