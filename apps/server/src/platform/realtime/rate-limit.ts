import type { ClientEventName } from '@comicle/shared';

import type { Clock } from '../clock';

const MS_PER_SECOND = 1000;

export interface BucketConfig {
  /** Burst size. */
  capacity: number;
  /** Tokens added back per second. */
  refillPerSecond: number;
}

export interface SocketRateLimitConfig {
  /** Shared by every event of a connection. */
  global: BucketConfig;
  /** Extra bucket for specific events; both must have a token. */
  perEvent: Partial<Record<ClientEventName, BucketConfig>>;
}

/** Defaults from docs/arquitetura.md §7: 20 events/s per connection, one autosave every 2 s. */
export const DEFAULT_SOCKET_RATE_LIMITS: SocketRateLimitConfig = {
  global: { capacity: 20, refillPerSecond: 20 },
  perEvent: {
    'panel:autosave': { capacity: 1, refillPerSecond: 0.5 },
  },
};

export class TokenBucket {
  private tokens: number;
  private updatedAt: number;

  constructor(
    private readonly config: BucketConfig,
    private readonly clock: Clock,
  ) {
    this.tokens = config.capacity;
    this.updatedAt = clock.now();
  }

  hasToken(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  take(): void {
    this.tokens -= 1;
  }

  private refill(): void {
    const now = this.clock.now();
    const elapsedSeconds = (now - this.updatedAt) / MS_PER_SECOND;
    this.tokens = Math.min(
      this.config.capacity,
      this.tokens + elapsedSeconds * this.config.refillPerSecond,
    );
    this.updatedAt = now;
  }
}

/** Token buckets of one socket connection. */
export class SocketRateLimiter {
  private readonly global: TokenBucket;
  private readonly perEvent = new Map<ClientEventName, TokenBucket>();

  constructor(
    private readonly config: SocketRateLimitConfig,
    private readonly clock: Clock,
  ) {
    this.global = new TokenBucket(config.global, clock);
  }

  /** Consumes a token for `event`; false means the event must be refused. */
  tryConsume(event: ClientEventName): boolean {
    const eventBucket = this.bucketFor(event);
    if (!this.global.hasToken() || (eventBucket && !eventBucket.hasToken())) {
      return false;
    }
    this.global.take();
    eventBucket?.take();
    return true;
  }

  private bucketFor(event: ClientEventName): TokenBucket | undefined {
    const config = this.config.perEvent[event];
    if (!config) {
      return undefined;
    }
    let bucket = this.perEvent.get(event);
    if (!bucket) {
      bucket = new TokenBucket(config, this.clock);
      this.perEvent.set(event, bucket);
    }
    return bucket;
  }
}
