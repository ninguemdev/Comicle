import { HEALTH_OK } from '@comicle/shared';
import type { FastifyInstance } from 'fastify';

const HTTP_SERVICE_UNAVAILABLE = 503;

/** `GET /healthz`: 200 when the database answers, 503 otherwise (protocolo §1). */
export function registerHealthRoute(
  http: FastifyInstance,
  checkDatabase: () => Promise<void>,
): void {
  http.get('/healthz', async (request, reply) => {
    try {
      await checkDatabase();
      return HEALTH_OK;
    } catch (error) {
      request.log.warn({ err: error }, 'database health check failed');
      return reply.status(HTTP_SERVICE_UNAVAILABLE).send({
        error: { code: 'INTERNAL', message: 'Banco de dados indisponível.' },
      });
    }
  });
}
