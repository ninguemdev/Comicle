import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  // @hq/shared exports raw TypeScript, so it must be bundled into the server.
  deps: { alwaysBundle: ['@hq/shared'] },
});
