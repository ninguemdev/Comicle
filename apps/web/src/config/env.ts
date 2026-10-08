import { z } from 'zod';

// docs/arquitetura.md §6.
const envSchema = z.object({
  /** Empty = same origin as the page. */
  VITE_SERVER_URL: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]).default(''),
  VITE_BASE_PATH: z.string().startsWith('/').default('/'),
});

export interface Env {
  /** Prefix of every HTTP and socket URL, without a trailing slash ('' = same origin). */
  serverUrl: string;
  /** Router `basename`: the base path without its trailing slash ('/' stays '/'). */
  routerBasename: string;
}

function withoutTrailingSlashes(path: string): string {
  return path.replace(/\/+$/, '');
}

export function parseEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.parse(raw);
  return {
    serverUrl: withoutTrailingSlashes(parsed.VITE_SERVER_URL),
    routerBasename: withoutTrailingSlashes(parsed.VITE_BASE_PATH) || '/',
  };
}

export const env = parseEnv(import.meta.env);
