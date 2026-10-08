import { createHash } from 'node:crypto';

import { GUEST_SESSION_TTL_MS } from '@comicle/shared';

import type { Clock } from '../../platform/clock';
import type { Scheduler } from '../../platform/scheduler';

/** How often expired sessions are dropped; expiry itself is checked on every use. */
export const SESSION_SWEEP_INTERVAL_MS = 10 * 60_000;

const SWEEP_KEY = 'guest-sessions:sweep';

/** docs/modelo-de-dados.md §1. The token itself is never kept, only its hash (R3, D13). */
export interface GuestSession {
  guestId: string;
  tokenHash: string;
  expiresAt: number;
}

export interface IssuedSession {
  token: string;
  guestId: string;
  expiresAt: number;
}

export interface GuestSessionStoreDeps {
  clock: Clock;
  scheduler: Scheduler;
  newToken: () => string;
  newId: () => string;
  ttlMs?: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** R3: in-memory guest sessions with a sliding expiry of `GUEST_SESSION_TTL_MS`. */
export class GuestSessionStore {
  private readonly sessions = new Map<string, GuestSession>();
  private readonly ttlMs: number;

  constructor(private readonly deps: GuestSessionStoreDeps) {
    this.ttlMs = deps.ttlMs ?? GUEST_SESSION_TTL_MS;
  }

  create(): IssuedSession {
    const token = this.deps.newToken();
    const session: GuestSession = {
      guestId: this.deps.newId(),
      tokenHash: hashToken(token),
      expiresAt: this.deps.clock.now() + this.ttlMs,
    };
    this.sessions.set(session.tokenHash, session);
    return { token, guestId: session.guestId, expiresAt: session.expiresAt };
  }

  /** Returns the session's guestId and renews its expiry, or null if unknown or expired. */
  authenticate(token: string): string | null {
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (!session) {
      return null;
    }
    const now = this.deps.clock.now();
    if (session.expiresAt <= now) {
      this.sessions.delete(tokenHash);
      return null;
    }
    session.expiresAt = now + this.ttlMs;
    return session.guestId;
  }

  /** Starts the periodic removal of expired sessions. */
  startSweeping(): void {
    this.scheduleSweep();
  }

  /** Read-only view of what the store keeps (tests check no plain token is there). */
  entries(): readonly Readonly<GuestSession>[] {
    return [...this.sessions.values()];
  }

  private scheduleSweep(): void {
    this.deps.scheduler.schedule(
      SWEEP_KEY,
      this.deps.clock.now() + SESSION_SWEEP_INTERVAL_MS,
      () => {
        this.removeExpired();
        this.scheduleSweep();
      },
    );
  }

  private removeExpired(): void {
    const now = this.deps.clock.now();
    for (const [tokenHash, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(tokenHash);
      }
    }
  }
}
