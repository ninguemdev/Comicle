// Ports away from `pnpm dev` (3000 and 5173), so both can run at the same time.
export const E2E_SERVER_PORT = 3100;
export const E2E_WEB_PORT = 5273;

export const SERVER_URL = `http://localhost:${String(E2E_SERVER_PORT)}`;
/** What the browsers open: the production build, proxying `/api` and `/socket.io` to the server. */
export const BASE_URL = `http://localhost:${String(E2E_WEB_PORT)}`;

export const E2E_DATABASE_URL = 'postgres://comicle:comicle@localhost:5432/comicle_test';
