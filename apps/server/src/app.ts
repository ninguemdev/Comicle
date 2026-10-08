import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import { HEALTH_OK, type HealthResponse } from '@comicle/shared';

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);

  app.get('/healthz', (): HealthResponse => HEALTH_OK);

  return app;
}
