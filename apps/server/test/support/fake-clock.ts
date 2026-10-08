import type { Clock } from '../../src/platform/clock';

/** Controllable clock; time only moves when a test (or ManualScheduler) moves it. */
export class FakeClock implements Clock {
  constructor(private current = 0) {}

  now(): number {
    return this.current;
  }

  set(instant: number): void {
    this.current = instant;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}
