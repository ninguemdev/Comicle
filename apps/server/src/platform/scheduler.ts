import type { Clock } from './clock';

export type ScheduledTask = () => void | Promise<void>;

/**
 * One timer per key (`room:<id>:phase`, `room:<id>:host-transfer`…). Scheduling an existing
 * key replaces the previous timer. `at` is an absolute instant in ms (arquitetura §4, Tempo).
 */
export interface Scheduler {
  schedule(key: string, at: number, task: ScheduledTask): void;
  cancel(key: string): void;
}

/** Real timers; used in production. */
export class TimerScheduler implements Scheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly clock: Clock,
    private readonly onError: (error: unknown, key: string) => void,
  ) {}

  schedule(key: string, at: number, task: ScheduledTask): void {
    this.cancel(key);
    const delay = Math.max(0, at - this.clock.now());
    const timer = setTimeout(() => {
      this.timers.delete(key);
      this.run(key, task);
    }, delay);
    this.timers.set(key, timer);
  }

  cancel(key: string): void {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  /** Stops every pending timer (graceful shutdown). */
  cancelAll(): void {
    for (const key of [...this.timers.keys()]) {
      this.cancel(key);
    }
  }

  private run(key: string, task: ScheduledTask): void {
    try {
      Promise.resolve(task()).catch((error: unknown) => {
        this.onError(error, key);
      });
    } catch (error) {
      this.onError(error, key);
    }
  }
}
