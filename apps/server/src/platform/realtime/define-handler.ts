import {
  clientEventSchemas,
  fail,
  ok,
  type Ack,
  type ClientEventAckData,
  type ClientEventName,
  type ParsedClientEventPayload,
} from '@comicle/shared';
import type { FastifyBaseLogger } from 'fastify';

import { DomainError } from '../errors';
import type { SocketRateLimiter } from './rate-limit';
import type { AppSocket } from './socket-types';

export interface HandlerContext {
  socket: AppSocket;
  log: FastifyBaseLogger;
}

export interface ConnectionContext extends HandlerContext {
  rateLimiter: SocketRateLimiter;
}

export type EventHandler<E extends ClientEventName> = (
  payload: ParsedClientEventPayload<E>,
  context: HandlerContext,
) => ClientEventAckData[E] | Promise<ClientEventAckData[E]>;

/** A handler bound to its event, ready to be attached to each new connection. */
export interface SocketHandler {
  event: ClientEventName;
  attach(connection: ConnectionContext): void;
}

const MESSAGES = {
  rateLimited: 'Muitas ações em pouco tempo. Aguarde um instante.',
  invalidPayload: 'Dados inválidos.',
  internal: 'Erro interno. Tente novamente.',
} as const;

type AckCallback = (response: Ack<unknown>) => void;

function isAckCallback(value: unknown): value is AckCallback {
  return typeof value === 'function';
}

/**
 * Thin handler wrapper (arquitetura §3.3): rate limit → schema validation → handler → `Ack`.
 * `DomainError` becomes `fail(code)`; anything else becomes `INTERNAL`, logged without payload.
 */
export function defineHandler<E extends ClientEventName>(
  event: E,
  handler: EventHandler<E>,
): SocketHandler {
  const schema = clientEventSchemas[event];

  async function respond(payload: unknown, context: ConnectionContext): Promise<Ack<unknown>> {
    if (!context.rateLimiter.tryConsume(event)) {
      return fail('RATE_LIMITED', MESSAGES.rateLimited);
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return fail('INVALID_PAYLOAD', MESSAGES.invalidPayload);
    }
    try {
      // The schema map guarantees `parsed.data` matches event `E`.
      const data = await handler(parsed.data as ParsedClientEventPayload<E>, context);
      return ok(data);
    } catch (error) {
      if (error instanceof DomainError) {
        return fail(error.code, error.message);
      }
      context.log.error({ err: error, event }, 'socket handler failed');
      return fail('INTERNAL', MESSAGES.internal);
    }
  }

  // Widened on purpose: the listener reads raw arguments and validates them itself.
  const eventName: ClientEventName = event;

  return {
    event,
    attach(context) {
      context.socket.on(eventName, (...args: unknown[]) => {
        const [payload, ack] = args;
        if (!isAckCallback(ack)) {
          context.log.debug({ event }, 'socket event without ack ignored');
          return;
        }
        void respond(payload, context).then(ack);
      });
    },
  };
}
