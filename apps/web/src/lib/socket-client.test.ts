import { afterEach, describe, expect, it, vi } from 'vitest';

import { ACK_TIMEOUT_MS, createSocketClient, type SocketClient } from './socket-client';

describe('socket-client', () => {
  let client: SocketClient | null = null;

  afterEach(() => {
    client?.disconnect();
    client = null;
    vi.useRealTimers();
  });

  it('emitWithAck: timeout resolve com ok: false', async () => {
    // Fake timers before creating the socket: Socket.IO captures setTimeout at construction.
    vi.useFakeTimers();
    client = createSocketClient({
      serverUrl: 'http://localhost:1',
      token: 'tok',
      onStatusChange: () => undefined,
      onUnauthorized: () => undefined,
    });

    // Never connected: the event stays in the buffer and no ack ever arrives.
    const pending = client.emitWithAck('room:leave', {});
    await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS);

    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  });
});
