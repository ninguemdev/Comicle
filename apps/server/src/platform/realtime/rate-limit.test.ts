import { describe, expect, it } from 'vitest';

import { FakeClock } from '../../../test/support/fake-clock';
import { DEFAULT_SOCKET_RATE_LIMITS, FailureRateLimiter, SocketRateLimiter } from './rate-limit';

function limiter(clock: FakeClock) {
  return new SocketRateLimiter(
    {
      global: { capacity: 3, refillPerSecond: 1 },
      perEvent: { 'panel:autosave': { capacity: 1, refillPerSecond: 0.5 } },
      failuresPerIp: {},
    },
    clock,
  );
}

describe('SocketRateLimiter', () => {
  it('N+1 eventos na mesma janela: o último é recusado', () => {
    const subject = limiter(new FakeClock());

    expect([1, 2, 3, 4].map(() => subject.tryConsume('theme:draft'))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('repõe fichas com o tempo, sem passar da capacidade', () => {
    const clock = new FakeClock();
    const subject = limiter(clock);
    for (let i = 0; i < 3; i++) subject.tryConsume('theme:draft');

    clock.advance(1000);
    expect(subject.tryConsume('theme:draft')).toBe(true);
    expect(subject.tryConsume('theme:draft')).toBe(false);

    clock.advance(60_000);
    expect([1, 2, 3, 4].map(() => subject.tryConsume('round:ready'))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('balde por evento: um autosave a cada 2 s, sem afetar outros eventos', () => {
    const clock = new FakeClock();
    const subject = limiter(clock);

    expect(subject.tryConsume('panel:autosave')).toBe(true);
    expect(subject.tryConsume('panel:autosave')).toBe(false);
    expect(subject.tryConsume('theme:draft')).toBe(true);

    clock.advance(2000);
    expect(subject.tryConsume('panel:autosave')).toBe(true);
  });

  it('evento recusado pelo balde próprio não gasta o balde global', () => {
    const subject = limiter(new FakeClock());
    subject.tryConsume('panel:autosave');
    subject.tryConsume('panel:autosave');
    subject.tryConsume('panel:autosave');

    expect(subject.tryConsume('theme:draft')).toBe(true);
    expect(subject.tryConsume('theme:draft')).toBe(true);
    expect(subject.tryConsume('theme:draft')).toBe(false);
  });
});

describe('FailureRateLimiter', () => {
  const MINUTE = 60_000;

  it('room:join: 10 falhas por minuto por IP; a 11ª tentativa é recusada até repor', () => {
    const clock = new FakeClock();
    const subject = new FailureRateLimiter(DEFAULT_SOCKET_RATE_LIMITS.failuresPerIp, clock);

    for (let i = 0; i < 10; i++) {
      expect(subject.allows('room:join', '10.0.0.1')).toBe(true);
      subject.recordFailure('room:join', '10.0.0.1');
    }
    expect(subject.allows('room:join', '10.0.0.1')).toBe(false);
    // Another IP and another event are not affected.
    expect(subject.allows('room:join', '10.0.0.2')).toBe(true);
    expect(subject.allows('room:create', '10.0.0.1')).toBe(true);

    clock.advance(MINUTE / 10);
    expect(subject.allows('room:join', '10.0.0.1')).toBe(true);
  });

  it('eventos sem limite de falhas nunca são recusados', () => {
    const subject = new FailureRateLimiter(
      DEFAULT_SOCKET_RATE_LIMITS.failuresPerIp,
      new FakeClock(),
    );
    for (let i = 0; i < 100; i++) {
      subject.recordFailure('theme:submit', '10.0.0.1');
    }
    expect(subject.allows('theme:submit', '10.0.0.1')).toBe(true);
  });
});
