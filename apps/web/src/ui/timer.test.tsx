import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Timer } from './timer';

const LOCAL_START = 1_000_000;
/** The server clock is 5 s ahead of the local one. */
const OFFSET_MS = 5000;

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function clock(): string | null {
  return screen.getByRole('timer').textContent;
}

function announcement(): string | null {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? null;
}

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: LOCAL_START });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra o restante pelo relógio do servidor (com offset)', () => {
    // Server now = 1_005_000; deadline 65 s later on the server clock.
    render(<Timer deadlineAt={LOCAL_START + OFFSET_MS + 65_000} offsetMs={OFFSET_MS} />);

    expect(clock()).toBe('1:05');

    advance(5000);
    expect(clock()).toBe('1:00');
  });

  it('nunca mostra tempo negativo', () => {
    render(<Timer deadlineAt={LOCAL_START + OFFSET_MS + 2000} offsetMs={OFFSET_MS} />);

    advance(10_000);

    expect(clock()).toBe('0:00');
  });

  it('anuncia 30 s, 10 s e o fim via aria-live, e nada além disso', () => {
    render(<Timer deadlineAt={LOCAL_START + OFFSET_MS + 45_000} offsetMs={OFFSET_MS} />);
    expect(announcement()).toBe('');

    advance(10_000);
    expect(clock()).toBe('0:35');
    expect(announcement()).toBe('');

    advance(5000);
    expect(clock()).toBe('0:30');
    expect(announcement()).toBe('Faltam 30 segundos');

    advance(20_000);
    expect(clock()).toBe('0:10');
    expect(announcement()).toBe('Faltam 10 segundos');

    advance(10_000);
    expect(clock()).toBe('0:00');
    expect(announcement()).toBe('Tempo esgotado!');
  });

  it('começando abaixo de 30 s não anuncia o marco já passado', () => {
    render(<Timer deadlineAt={LOCAL_START + OFFSET_MS + 20_000} offsetMs={OFFSET_MS} />);

    advance(5000);

    expect(clock()).toBe('0:15');
    expect(announcement()).toBe('');
  });
});
