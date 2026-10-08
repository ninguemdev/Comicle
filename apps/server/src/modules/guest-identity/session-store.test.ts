import { GUEST_SESSION_TTL_MS } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { FakeClock } from '../../../test/support/fake-clock';
import { ManualScheduler } from '../../../test/support/manual-scheduler';
import { GuestSessionStore, SESSION_SWEEP_INTERVAL_MS } from './session-store';

function setup() {
  const scheduler = new ManualScheduler(new FakeClock(1_000_000));
  let counter = 0;
  const store = new GuestSessionStore({
    clock: scheduler.clock,
    scheduler,
    newToken: () => `token-secreto-${String(++counter)}`,
    newId: () => `guest-${String(counter)}`,
  });
  return { store, scheduler, clock: scheduler.clock };
}

describe('GuestSessionStore', () => {
  it('R3: o token emitido autentica e devolve o mesmo guestId', () => {
    const { store } = setup();
    const issued = store.create();

    expect(store.authenticate(issued.token)).toBe(issued.guestId);
    expect(issued.expiresAt).toBe(1_000_000 + GUEST_SESSION_TTL_MS);
  });

  it('R3: token desconhecido não autentica', () => {
    const { store } = setup();
    store.create();

    expect(store.authenticate('outro-token')).toBeNull();
  });

  it(`R3: após GUEST_SESSION_TTL_MS sem uso, expira`, () => {
    const { store, clock } = setup();
    const { token } = store.create();

    clock.advance(GUEST_SESSION_TTL_MS);

    expect(store.authenticate(token)).toBeNull();
    expect(store.entries()).toHaveLength(0);
  });

  it('R3: uso no meio do período renova o prazo', () => {
    const { store, clock } = setup();
    const { token, guestId } = store.create();

    clock.advance(GUEST_SESSION_TTL_MS - 1);
    expect(store.authenticate(token)).toBe(guestId);
    clock.advance(GUEST_SESSION_TTL_MS - 1);

    expect(store.authenticate(token)).toBe(guestId);
  });

  it('R3: o store guarda só o hash, nunca o token em texto', () => {
    const { store } = setup();
    const { token } = store.create();

    const state = JSON.stringify(store.entries());

    expect(state).not.toContain(token);
    expect(store.entries()[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a varredura periódica remove sessões expiradas e mantém as válidas', async () => {
    const { store, scheduler, clock } = setup();
    store.startSweeping();
    store.create();
    clock.advance(GUEST_SESSION_TTL_MS - SESSION_SWEEP_INTERVAL_MS);
    const fresh = store.create();

    await scheduler.advanceBy(SESSION_SWEEP_INTERVAL_MS * 2);

    expect(store.entries().map((session) => session.guestId)).toEqual([fresh.guestId]);
    expect(scheduler.pendingKeys()).toEqual(['guest-sessions:sweep']);
  });
});
