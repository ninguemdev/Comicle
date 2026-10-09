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
  /**
   * Failed attempts per IP, shared by every connection from it: a failure takes a token, and an
   * IP without tokens is refused before trying again (scanning room codes, arquitetura §7).
   */
  failuresPerIp: Partial<Record<ClientEventName, BucketConfig>>;
}

const SECONDS_PER_MINUTE = 60;
const FAILED_JOINS_PER_MINUTE = 10;

/**
 * Defaults from docs/arquitetura.md §7: 20 events/s per connection, one autosave every 2 s and
 * 10 failed `room:join` per minute per IP.
 */
export const DEFAULT_SOCKET_RATE_LIMITS: SocketRateLimitConfig = {
  global: { capacity: 20, refillPerSecond: 20 },
  perEvent: {
    'panel:autosave': { capacity: 1, refillPerSecond: 0.5 },
  },
  failuresPerIp: {
    'room:join': {
      capacity: FAILED_JOINS_PER_MINUTE,
      refillPerSecond: FAILED_JOINS_PER_MINUTE / SECONDS_PER_MINUTE,
    },
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
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  isFull(): boolean {
    this.refill();
    return this.tokens >= this.config.capacity;
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

/** Above this many tracked IPs, full buckets (nothing to remember) are dropped. */
const MAX_TRACKED_KEYS = 10_000;

/** Failure buckets by event and IP, shared by every connection of the server. */
export class FailureRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly config: SocketRateLimitConfig['failuresPerIp'],
    private readonly clock: Clock,
  ) {}

  /** False while `ip` has used up its failures of `event`. */
  allows(event: ClientEventName, ip: string): boolean {
    return this.buckets.get(keyOf(event, ip))?.hasToken() ?? true;
  }

  recordFailure(event: ClientEventName, ip: string): void {
    const config = this.config[event];
    if (!config) {
      return;
    }
    const key = keyOf(event, ip);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      this.forgetIdle();
      bucket = new TokenBucket(config, this.clock);
      this.buckets.set(key, bucket);
    }
    bucket.take();
  }

  private forgetIdle(): void {
    if (this.buckets.size < MAX_TRACKED_KEYS) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.isFull()) {
        this.buckets.delete(key);
      }
    }
  }
}

function keyOf(event: ClientEventName, ip: string): string {
  return `${event} ${ip}`;
}
