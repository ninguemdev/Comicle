import { describe, expect, it } from 'vitest';

import { FakeClock } from '../../../test/support/fake-clock';
import { SocketRateLimiter } from './rate-limit';

function limiter(clock: FakeClock) {
  return new SocketRateLimiter(
    {
      global: { capacity: 3, refillPerSecond: 1 },
      perEvent: { 'panel:autosave': { capacity: 1, refillPerSecond: 0.5 } },
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
