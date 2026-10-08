import { describe, expect, it } from 'vitest';

import { FakeClock } from './fake-clock';
import { ManualScheduler } from './manual-scheduler';

function setup() {
  const scheduler = new ManualScheduler(new FakeClock(1000));
  const fired: string[] = [];
  const record = (label: string) => () => {
    fired.push(`${label}@${String(scheduler.clock.now())}`);
  };
  return { scheduler, fired, record };
}

describe('ManualScheduler', () => {
  it('nada dispara antes de o tempo avançar', async () => {
    const { scheduler, fired, record } = setup();
    scheduler.schedule('a', 1000, record('a'));

    expect(fired).toEqual([]);
    await scheduler.runDue();
    expect(fired).toEqual(['a@1000']);
  });

  it('reagendar a mesma chave cancela a anterior', async () => {
    const { scheduler, fired, record } = setup();
    scheduler.schedule('phase', 1500, record('first'));
    scheduler.schedule('phase', 2500, record('second'));

    await scheduler.advanceBy(5000);

    expect(fired).toEqual(['second@2500']);
  });

  it('cancel impede o disparo', async () => {
    const { scheduler, fired, record } = setup();
    scheduler.schedule('a', 1500, record('a'));
    scheduler.cancel('a');

    await scheduler.advanceBy(5000);

    expect(fired).toEqual([]);
    expect(scheduler.has('a')).toBe(false);
  });

  it('dispara por ordem de instante, e empates na ordem de agendamento', async () => {
    const { scheduler, fired, record } = setup();
    scheduler.schedule('late', 3000, record('late'));
    scheduler.schedule('tie-1', 2000, record('tie-1'));
    scheduler.schedule('early', 1200, record('early'));
    scheduler.schedule('tie-2', 2000, record('tie-2'));

    expect(scheduler.pendingKeys()).toEqual(['early', 'tie-1', 'tie-2', 'late']);
    await scheduler.advanceTo(2500);

    expect(fired).toEqual(['early@1200', 'tie-1@2000', 'tie-2@2000']);
    expect(scheduler.clock.now()).toBe(2500);
    expect(scheduler.pendingKeys()).toEqual(['late']);
  });

  it('timers agendados durante um disparo também disparam se vencerem na janela', async () => {
    const { scheduler, fired, record } = setup();
    scheduler.schedule('a', 1500, () => {
      record('a')();
      scheduler.schedule('b', scheduler.clock.now() + 100, record('b'));
      scheduler.cancel('c');
    });
    scheduler.schedule('c', 1550, record('c'));

    await scheduler.advanceBy(1000);

    expect(fired).toEqual(['a@1500', 'b@1600']);
  });

  it('espera tarefas assíncronas antes do próximo disparo', async () => {
    const { scheduler, fired, record } = setup();
    scheduler.schedule('slow', 1100, async () => {
      await Promise.resolve();
      record('slow')();
    });
    scheduler.schedule('next', 1200, record('next'));

    await scheduler.advanceBy(500);

    expect(fired).toEqual(['slow@1100', 'next@1200']);
  });

  it('não volta no tempo', async () => {
    const { scheduler } = setup();

    await expect(scheduler.advanceTo(999)).rejects.toThrow(RangeError);
  });
});
