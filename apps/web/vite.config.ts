import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEV_SERVER_PORT = 5173;
const API_TARGET = 'http://localhost:3000';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: DEV_SERVER_PORT,
      strictPort: true,
      // Exposes the dev server on the LAN so other devices can join a test match.
      host: true,
      proxy: {
        '/api': API_TARGET,
        '/healthz': API_TARGET,
        '/socket.io': { target: API_TARGET, ws: true },
      },
    },
  };
});
