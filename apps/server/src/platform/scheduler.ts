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
    this.arm(key, at, task);
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

  /**
   * Node measures `setTimeout` from the event loop's cached time, which can lag `clock.now()`,
   * so a timer may fire a few ms before `at`. Tasks rely on `now >= at` (a phase deadline that
   * looks early is ignored as stale), so an early wake-up waits for the rest instead of running.
   */
  private arm(key: string, at: number, task: ScheduledTask): void {
    const timer = setTimeout(
      () => {
        if (this.clock.now() < at) {
          this.arm(key, at, task);
          return;
        }
        this.timers.delete(key);
        this.run(key, task);
      },
      Math.max(0, at - this.clock.now()),
    );
    this.timers.set(key, timer);
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
