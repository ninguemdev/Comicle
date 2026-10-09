import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEV_SERVER_PORT = 5173;
// The E2E suite runs its own server on another port (playwright.config.ts).
const API_TARGET = process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000';

const apiProxy = {
  '/api': API_TARGET,
  '/healthz': API_TARGET,
  '/socket.io': { target: API_TARGET, ws: true },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    server: {
      port: DEV_SERVER_PORT,
      strictPort: true,
      // Exposes the dev server on the LAN so other devices can join a test match.
      host: true,
      proxy: apiProxy,
    },
    // `vite preview` serves the production build for the E2E suite, with the same proxy.
    preview: { proxy: apiProxy },
  };
});
