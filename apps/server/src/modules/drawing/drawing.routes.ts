import { roomCodeSchema } from '@comicle/shared';
import type { FastifyInstance, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';

import { DomainError } from '../../platform/errors';
import type { DrawingService } from './drawing.service';

const HTTP_NO_CONTENT = 204;

/** R59: images never stay in a browser or proxy cache. */
function sendPng(reply: FastifyReply, png: Uint8Array): FastifyReply {
  return reply
    .header('Cache-Control', 'private, no-store')
    .type('image/png')
    .send(Buffer.from(png.buffer, png.byteOffset, png.byteLength));
}

/** `GET /api/panels/:panelId` and `GET /api/rooms/:code/my-draft` (protocolo §1). */
export function registerDrawingRoutes(
  http: FastifyInstance,
  service: DrawingService,
  requireGuest: preHandlerAsyncHookHandler,
): void {
  http.get<{ Params: { panelId: string } }>(
    '/api/panels/:panelId',
    { preHandler: requireGuest },
    async (request, reply) =>
      sendPng(reply, await service.panelImage(request.guestId, request.params.panelId)),
  );

  http.get<{ Params: { code: string } }>(
    '/api/rooms/:code/my-draft',
    { preHandler: requireGuest },
    (request, reply) => {
      const parsed = roomCodeSchema.safeParse(request.params.code);
      if (!parsed.success) {
        throw new DomainError('ROOM_NOT_FOUND', 'Sala não encontrada.');
      }
      const draft = service.myDraft(request.guestId, parsed.data);
      if (draft === null) {
        return reply.header('Cache-Control', 'private, no-store').status(HTTP_NO_CONTENT).send();
      }
      return sendPng(reply, draft);
    },
  );
}
