import type { FastifyHelmetOptions } from '@fastify/helmet';

/**
 * `@fastify/helmet` with the CSP the web build needs (arquitetura §7). On top of helmet's
 * defaults (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`…):
 * - `img-src` takes `blob:`: panel images and the drawing draft are fetched with the session
 *   token and shown through `blob:` URLs (protocolo §1).
 * - no `upgrade-insecure-requests`: a self-hosted install may be served over plain HTTP, where
 *   upgrading the page's own requests would break it; HTTPS deployments use HSTS instead.
 */
export const HELMET_OPTIONS: FastifyHelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'blob:'],
      'upgrade-insecure-requests': null,
    },
  },
};
