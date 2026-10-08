import type { ScheduledTask, Scheduler } from '../../src/platform/scheduler';
import { FakeClock } from './fake-clock';

interface Timer {
  key: string;
  at: number;
  /** Tie-breaker: timers due at the same instant fire in scheduling order. */
  order: number;
  task: ScheduledTask;
}

/**
 * Scheduler driven by the test: nothing fires until `advanceBy`, `advanceTo` or `runDue`.
 * Each fired task is awaited, so room queues settle before the next timer runs.
 */
export class ManualScheduler implements Scheduler {
  private readonly timers = new Map<string, Timer>();
  private nextOrder = 0;

  constructor(readonly clock: FakeClock = new FakeClock()) {}

  schedule(key: string, at: number, task: ScheduledTask): void {
    this.timers.set(key, { key, at, order: this.nextOrder++, task });
  }

  cancel(key: string): void {
    this.timers.delete(key);
  }

  has(key: string): boolean {
    return this.timers.has(key);
  }

  /** Instant a key is scheduled for, or undefined. */
  scheduledAt(key: string): number | undefined {
    return this.timers.get(key)?.at;
  }

  /** Pending keys ordered by firing order. */
  pendingKeys(): string[] {
    return this.sorted().map((timer) => timer.key);
  }

  /** Fires every timer already due at the current instant, without moving the clock. */
  async runDue(): Promise<void> {
    await this.fireUntil(this.clock.now());
  }

  /** Moves the clock to `instant`, firing due timers in order (each at its own instant). */
  async advanceTo(instant: number): Promise<void> {
    if (instant < this.clock.now()) {
      throw new RangeError('ManualScheduler não volta no tempo');
    }
    await this.fireUntil(instant);
    this.clock.set(instant);
  }

  async advanceBy(ms: number): Promise<void> {
    await this.advanceTo(this.clock.now() + ms);
  }

  private async fireUntil(limit: number): Promise<void> {
    // Re-evaluated each turn: a task may schedule or cancel other timers.
    for (let timer = this.nextDue(limit); timer; timer = this.nextDue(limit)) {
      this.timers.delete(timer.key);
      this.clock.set(Math.max(this.clock.now(), timer.at));
      await timer.task();
    }
  }

  private nextDue(limit: number): Timer | undefined {
    const [first] = this.sorted();
    return first && first.at <= limit ? first : undefined;
  }

  private sorted(): Timer[] {
    return [...this.timers.values()].sort((a, b) => a.at - b.at || a.order - b.order);
  }
}
