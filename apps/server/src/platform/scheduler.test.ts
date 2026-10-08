import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SystemClock } from './clock';
import { TimerScheduler } from './scheduler';

describe('TimerScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 10_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const onError = vi.fn();
    const scheduler = new TimerScheduler(new SystemClock(), onError);
    return { scheduler, onError };
  }

  it('dispara no instante absoluto pedido', () => {
    const { scheduler } = setup();
    const task = vi.fn();
    scheduler.schedule('a', 12_000, task);

    vi.advanceTimersByTime(1999);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledOnce();
  });

  it('reagendar a mesma chave cancela a anterior; cancel e cancelAll impedem o disparo', () => {
    const { scheduler } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const other = vi.fn();
    scheduler.schedule('phase', 11_000, first);
    scheduler.schedule('phase', 13_000, second);
    scheduler.schedule('other', 11_000, other);
    scheduler.cancel('other');
    scheduler.schedule('late', 20_000, other);
    scheduler.cancelAll();
    scheduler.schedule('phase', 13_000, second);

    vi.advanceTimersByTime(20_000);

    expect(first).not.toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('instante no passado dispara logo', () => {
    const { scheduler } = setup();
    const task = vi.fn();
    scheduler.schedule('a', 5000, task);

    vi.advanceTimersByTime(0);

    expect(task).toHaveBeenCalledOnce();
  });

  it('erros síncronos e assíncronos vão para onError com a chave', async () => {
    const { scheduler, onError } = setup();
    const syncError = new Error('sync');
    const asyncError = new Error('async');
    scheduler.schedule('sync', 10_000, () => {
      throw syncError;
    });
    scheduler.schedule('async', 10_000, () => Promise.reject(asyncError));

    await vi.advanceTimersByTimeAsync(0);

    expect(onError).toHaveBeenCalledWith(syncError, 'sync');
    expect(onError).toHaveBeenCalledWith(asyncError, 'async');
  });
});
