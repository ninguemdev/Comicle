import { defineConfig, devices } from '@playwright/test';

import {
  BASE_URL,
  E2E_DATABASE_URL,
  E2E_SERVER_PORT,
  E2E_WEB_PORT,
  SERVER_URL,
} from './e2e/support/env';

const isCi = process.env['CI'] !== undefined;
const SERVER_START_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 90_000;
const EXPECT_TIMEOUT_MS = 10_000;
const CI_WORKERS = 2;
const LOCAL_WORKERS = 3;

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  outputDir: './test-results',
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  workers: isCi ? CI_WORKERS : LOCAL_WORKERS,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: 'mobile.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: 'mobile.spec.ts', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @comicle/server exec tsx src/main.ts',
      url: `${SERVER_URL}/healthz`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(E2E_SERVER_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        GAME_TIMING_PROFILE: 'fast',
        // Each player sends its own X-Forwarded-For, so the per-IP limits (T19) do not pool
        // every test player of the run into one address.
        TRUST_PROXY: 'true',
        LOG_LEVEL: 'warn',
      },
    },
    {
      // The production build, not the dev server: no HMR and no optimizer reloads mid-test.
      command: `pnpm --filter @comicle/web build && pnpm --filter @comicle/web exec vite preview --port ${String(E2E_WEB_PORT)} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      // Closing the browsers at the end makes the proxy log harmless socket resets.
      stdout: 'ignore',
      stderr: 'ignore',
      env: { API_PROXY_TARGET: SERVER_URL },
    },
  ],
});
