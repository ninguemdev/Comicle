// Server clock estimate (docs/protocolo-realtime.md §6).

export const TIME_SYNC_SAMPLE_COUNT = 3;
export const TIME_SYNC_INTERVAL_MS = 60_000;

/** One `time:sync` round trip, in local ms (`clientSentAt`, `receivedAt`) and server ms. */
export interface TimeSample {
  clientSentAt: number;
  serverNow: number;
  receivedAt: number;
}

/**
 * `serverNow + rtt / 2 − receivedAt` of the sample with the smallest round trip, the least
 * distorted by network jitter; `null` without samples.
 */
export function computeClockOffset(samples: readonly TimeSample[]): number | null {
  let best: { rtt: number; offset: number } | null = null;
  for (const sample of samples) {
    const rtt = sample.receivedAt - sample.clientSentAt;
    if (best === null || rtt < best.rtt) {
      best = { rtt, offset: sample.serverNow + rtt / 2 - sample.receivedAt };
    }
  }
  return best === null ? null : best.offset;
}

export interface TimeSyncOptions {
  /** Sends one `time:sync`; `null` when it failed. */
  requestSample: () => Promise<TimeSample | null>;
  onOffset: (offsetMs: number) => void;
}

/** Measures right away and then every `TIME_SYNC_INTERVAL_MS`; returns the function that stops it. */
export function startTimeSync({ requestSample, onOffset }: TimeSyncOptions): () => void {
  let stopped = false;

  async function measure(): Promise<void> {
    const samples: TimeSample[] = [];
    // Sequential, so one sample's queueing does not inflate the next one's round trip.
    for (let i = 0; i < TIME_SYNC_SAMPLE_COUNT && !stopped; i++) {
      const sample = await requestSample();
      if (sample !== null) {
        samples.push(sample);
      }
    }
    const offset = computeClockOffset(samples);
    if (!stopped && offset !== null) {
      onOffset(offset);
    }
  }

  void measure();
  const interval = setInterval(() => void measure(), TIME_SYNC_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

/** Server time now, as seen through the measured offset. */
export function serverNow(offsetMs: number, localNow: number = Date.now()): number {
  return localNow + offsetMs;
}
