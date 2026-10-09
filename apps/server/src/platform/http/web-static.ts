import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/** Vite writes the hashed bundles here: a new build gets new names, so they never change. */
const HASHED_ASSETS_DIR = 'assets';
const INDEX_FILE = 'index.html';
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** Everything else (the page, the favicon, avatar art) keeps its name: revalidate every time. */
const REVALIDATE = 'no-cache';
/** Server paths a client route never uses: a miss there is a real 404, not the page. */
const SERVER_PATHS = ['/api/', '/socket.io/', '/healthz'];

export interface WebStaticOptions {
  /** The web build (`apps/web/dist`), from `SERVE_WEB_DIST`. */
  root: string;
  /** `PUBLIC_BASE_PATH`: where the build was made to live (`VITE_BASE_PATH` of the same build). */
  basePath: string;
}

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

function cacheControlFor(root: string, filePath: string): string {
  return relative(root, filePath).startsWith(`${HASHED_ASSETS_DIR}${sep}`) ? IMMUTABLE : REVALIDATE;
}

/**
 * Whether a GET that matched no file is a route of the client (`/sala/K7PQ2M`), answered with
 * `index.html` so a reload works. Paths with an extension are missing files; server paths are
 * API misses.
 */
function isClientRoute(url: string, basePath: string): boolean {
  const path = url.split('?')[0] ?? '';
  if (!path.startsWith(basePath) || SERVER_PATHS.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  return !lastSegment.includes('.');
}

/**
 * Serves the web build under the base path (arquitetura §9): hashed assets cached for a year,
 * the rest revalidated, and client routes falling back to `index.html`.
 */
export async function registerWebStatic(
  http: FastifyInstance,
  { root, basePath }: WebStaticOptions,
): Promise<void> {
  if (!existsSync(join(root, INDEX_FILE))) {
    throw new Error(`SERVE_WEB_DIST não tem ${INDEX_FILE}: "${root}"`);
  }
  const prefix = withTrailingSlash(basePath);
  await http.register(fastifyStatic, {
    root,
    prefix,
    // One route per file of the build, so the catch-all below only sees misses.
    wildcard: false,
    // `/jogos/quadrinhos` → `/jogos/quadrinhos/`; at the root there is nothing to redirect.
    redirect: prefix !== '/',
    cacheControl: false,
    setHeaders: (reply, filePath) => {
      void reply.header('Cache-Control', cacheControlFor(root, filePath));
    },
  });
  http.get(`${prefix}*`, (request, reply) => {
    if (!isClientRoute(request.url, prefix)) {
      reply.callNotFound();
      return reply;
    }
    return reply.header('Cache-Control', REVALIDATE).sendFile(INDEX_FILE, root);
  });
}
