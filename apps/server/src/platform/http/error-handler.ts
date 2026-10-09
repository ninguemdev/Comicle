import type { ErrorCode } from '@comicle/shared';
import type { FastifyError, FastifyInstance } from 'fastify';

import { DomainError } from '../errors';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_PAYLOAD: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  ROOM_NOT_FOUND: 404,
  ROOM_FULL: 409,
  ROOM_CLOSED: 410,
  KICKED: 403,
  NOT_IN_ROOM: 403,
  NOT_HOST: 403,
  FORBIDDEN: 403,
  PANEL_NOT_FOUND: 404,
  INVALID_STATE: 409,
  NOT_ENOUGH_PLAYERS: 409,
  DEADLINE_PASSED: 409,
  IMAGE_INVALID: 400,
  IMAGE_TOO_LARGE: 413,
  INTERNAL: 500,
};

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;

const MESSAGES = {
  rateLimited: 'Muitas requisições. Aguarde um instante.',
  invalidPayload: 'Requisição inválida.',
  internal: 'Erro interno. Tente novamente.',
} as const;

function errorBody(code: ErrorCode, message: string) {
  return { error: { code, message } };
}

/** Every HTTP error leaves as `{ error: { code, message } }` (protocolo §1), never a stack trace. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | DomainError, request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(STATUS_BY_CODE[error.code]).send(errorBody(error.code, error.message));
    }
    const status = error.statusCode ?? HTTP_SERVER_ERROR;
    if (status === HTTP_TOO_MANY_REQUESTS) {
      return reply.status(status).send(errorBody('RATE_LIMITED', MESSAGES.rateLimited));
    }
    if (status >= HTTP_BAD_REQUEST && status < HTTP_SERVER_ERROR) {
      return reply.status(status).send(errorBody('INVALID_PAYLOAD', MESSAGES.invalidPayload));
    }
    request.log.error({ err: error }, 'request failed');
    return reply.status(HTTP_SERVER_ERROR).send(errorBody('INTERNAL', MESSAGES.internal));
  });
}
