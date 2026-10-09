import { defaultAvatar } from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import {
  connectGuest,
  startTestServer,
  type TestClient,
  type TestServer,
  type TestServerOverrides,
} from '../support/test-server';

describe('handlers de socket', () => {
  let server: TestServer | undefined;
  let client: TestClient | undefined;

  afterEach(async () => {
    client?.disconnect();
    await server?.close();
  });

  async function start(overrides: TestServerOverrides = {}) {
    server = await startTestServer(overrides);
    ({ client } = await connectGuest(server));
    return { server, client };
  }

  it('payload válido chega ao handler e recebe ack ok', async () => {
    const { client } = await start();

    const ack = await client.emitWithAck('room:create', {
      profile: { nickname: 'Ana', avatar: defaultAvatar() },
    });

    expect(ack).toEqual({ ok: true, data: { roomCode: expect.any(String) as string } });
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

  it('DomainError → ack com o código e a mensagem dele', async () => {
    const { client } = await start();

    const ack = await client.emitWithAck('presentation:navigate', {
      action: 'goToStory',
      storyIndex: 1,
    });

    expect(ack).toEqual({
      ok: false,
      error: { code: 'NOT_IN_ROOM', message: 'Você não está nesta sala.' },
    });
  });

  it('exceção qualquer → INTERNAL, sem vazar a mensagem interna', async () => {
    const storyRepository = new InMemoryStoryRepository();
    vi.spyOn(storyRepository, 'createRoom').mockRejectedValue(new Error('falha inesperada'));
    const { client } = await start({ storyRepository });

    const ack = await client.emitWithAck('room:create', {
      profile: { nickname: 'Ana', avatar: defaultAvatar() },
    });

    expect(ack).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Erro interno. Tente novamente.' },
    });
  });

  it('rate limit: N+1 eventos na janela → o último recebe RATE_LIMITED', async () => {
    const { client } = await start({
      socketRateLimits: {
        global: { capacity: 3, refillPerSecond: 1 },
        perEvent: {},
        failuresPerIp: {},
      },
    });

    const acks = [];
    for (let i = 0; i < 4; i++) {
      acks.push(await client.emitWithAck('time:sync', { clientSentAt: i }));
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
