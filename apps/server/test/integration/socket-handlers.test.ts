import { afterEach, describe, expect, it } from 'vitest';

import { defineHandler } from '../../src/platform/realtime/define-handler';
import { DomainError } from '../../src/platform/errors';
import {
  connectGuest,
  startTestServer,
  type TestClient,
  type TestServer,
  type TestServerOverrides,
} from '../support/test-server';

// `presentation:navigate` is used as a test-only event: no module registers it yet (T16).
const NOT_HOST_STORY = 1;
const CRASH_STORY = 2;
const navigateHandler = defineHandler('presentation:navigate', (payload) => {
  if (payload.action !== 'goToStory') {
    return {};
  }
  switch (payload.storyIndex) {
    case NOT_HOST_STORY:
      throw new DomainError('NOT_HOST', 'Só o anfitrião pode expulsar.');
    case CRASH_STORY:
      throw new Error('falha inesperada');
    default:
      return {};
  }
});

describe('handlers de socket', () => {
  let server: TestServer | undefined;
  let client: TestClient | undefined;

  afterEach(async () => {
    client?.disconnect();
    await server?.close();
  });

  async function start(overrides: TestServerOverrides = {}) {
    server = await startTestServer({ extraSocketHandlers: [navigateHandler], ...overrides });
    ({ client } = await connectGuest(server));
    return { server, client };
  }

  it('payload válido chega ao handler e recebe ack ok', async () => {
    const { client } = await start();

    expect(await client.emitWithAck('presentation:navigate', { action: 'next' })).toEqual({
      ok: true,
      data: {},
    });
  });

  it('payload inválido → INVALID_PAYLOAD', async () => {
    const { client } = await start();

    // @ts-expect-error: invalid payload on purpose
    const ack = await client.emitWithAck('presentation:navigate', { action: 'voar' });

    expect(ack).toEqual({
      ok: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Dados inválidos.' },
    });
  });

  it("DomainError('NOT_HOST') → ack com esse código e a mensagem", async () => {
    const { client } = await start();

    const ack = await client.emitWithAck('presentation:navigate', {
      action: 'goToStory',
      storyIndex: NOT_HOST_STORY,
    });

    expect(ack).toEqual({
      ok: false,
      error: { code: 'NOT_HOST', message: 'Só o anfitrião pode expulsar.' },
    });
  });

  it('exceção qualquer → INTERNAL, sem vazar a mensagem interna', async () => {
    const { client } = await start();

    const ack = await client.emitWithAck('presentation:navigate', {
      action: 'goToStory',
      storyIndex: CRASH_STORY,
    });

    expect(ack).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Erro interno. Tente novamente.' },
    });
  });

  it('rate limit: N+1 eventos na janela → o último recebe RATE_LIMITED', async () => {
    const { client } = await start({
      socketRateLimits: { global: { capacity: 3, refillPerSecond: 1 }, perEvent: {} },
    });

    const acks = [];
    for (let i = 0; i < 4; i++) {
      acks.push(await client.emitWithAck('presentation:navigate', { action: 'next' }));
    }

    expect(acks.map((ack) => ack.ok)).toEqual([true, true, true, false]);
    expect(acks[3]).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
  });

  it('R61: time:sync devolve clientSentAt e o relógio do servidor', async () => {
    const { server, client } = await start();
    server.clock.set(1_800_000_000_000);

    expect(await client.emitWithAck('time:sync', { clientSentAt: 123 })).toEqual({
      ok: true,
      data: { clientSentAt: 123, serverNow: 1_800_000_000_000 },
    });
  });
});
