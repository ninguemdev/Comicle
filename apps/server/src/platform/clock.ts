/** Injected time source, so pure code never calls `Date.now()` (arquitetura §4). */
export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
