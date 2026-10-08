import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  computeClockOffset,
  startTimeSync,
  TIME_SYNC_INTERVAL_MS,
  TIME_SYNC_SAMPLE_COUNT,
  type TimeSample,
} from './time-sync';

describe('computeClockOffset', () => {
  it('escolhe a amostra de menor RTT e calcula o offset', () => {
    const samples: TimeSample[] = [
      // rtt 300 → offset 10_000 + 150 − 1300 = 8850
      { clientSentAt: 1000, serverNow: 10_000, receivedAt: 1300 },
      // rtt 40 → offset 10_500 + 20 − 1540 = 8980 (escolhida)
      { clientSentAt: 1500, serverNow: 10_500, receivedAt: 1540 },
      // rtt 120 → offset 11_000 + 60 − 2120 = 8940
      { clientSentAt: 2000, serverNow: 11_000, receivedAt: 2120 },
    ];

    expect(computeClockOffset(samples)).toBe(8980);
  });

  it('aceita relógio local adiantado (offset negativo)', () => {
    // rtt 20 → 2010 + 10 − 5020.
    expect(computeClockOffset([{ clientSentAt: 5000, serverNow: 2010, receivedAt: 5020 }])).toBe(
      -3000,
    );
  });

  it('sem amostras não há offset', () => {
    expect(computeClockOffset([])).toBeNull();
  });
});

describe('startTimeSync', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mede três vezes ao iniciar e de novo a cada 60 s, até parar', async () => {
    vi.useFakeTimers();
    let rtt = 50;
    const requestSample = vi.fn(() => {
      rtt -= 10;
      return Promise.resolve({ clientSentAt: 0, serverNow: 1000, receivedAt: rtt });
    });
    const onOffset = vi.fn<(offset: number) => void>();

    const stop = startTimeSync({ requestSample, onOffset });
    await vi.advanceTimersByTimeAsync(0);

    expect(requestSample).toHaveBeenCalledTimes(TIME_SYNC_SAMPLE_COUNT);
    // Smallest rtt of the burst is 20 → 1000 + 10 − 20.
    expect(onOffset).toHaveBeenLastCalledWith(990);

    await vi.advanceTimersByTimeAsync(TIME_SYNC_INTERVAL_MS);
    expect(requestSample).toHaveBeenCalledTimes(2 * TIME_SYNC_SAMPLE_COUNT);

    stop();
    await vi.advanceTimersByTimeAsync(TIME_SYNC_INTERVAL_MS);
    expect(requestSample).toHaveBeenCalledTimes(2 * TIME_SYNC_SAMPLE_COUNT);
  });

  it('ignora amostras que falharam', async () => {
    vi.useFakeTimers();
    const requestSample = vi.fn<() => Promise<TimeSample | null>>(() => Promise.resolve(null));
    const onOffset = vi.fn<(offset: number) => void>();

    const stop = startTimeSync({ requestSample, onOffset });
    await vi.advanceTimersByTimeAsync(0);
    stop();

    expect(onOffset).not.toHaveBeenCalled();
  });
});
