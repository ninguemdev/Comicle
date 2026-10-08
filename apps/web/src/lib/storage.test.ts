import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createSafeStorage, storage } from './storage';

const schema = z.object({ token: z.string() });

function throwingBackend() {
  return {
    getItem: () => {
      throw new DOMException('blocked', 'SecurityError');
    },
    setItem: () => {
      throw new DOMException('full', 'QuotaExceededError');
    },
    removeItem: () => {
      throw new DOMException('blocked', 'SecurityError');
    },
  };
}

describe('storage', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('grava e lê um valor válido', () => {
    expect(storage.write('k', { token: 'abc' })).toBe(true);

    expect(storage.read('k', schema)).toEqual({ token: 'abc' });
  });

  it('localStorage que lança exceção não quebra quem usa', () => {
    const blocked = createSafeStorage(throwingBackend);

    expect(blocked.read('k', schema)).toBeNull();
    expect(blocked.write('k', { token: 'abc' })).toBe(false);
    expect(() => {
      blocked.remove('k');
    }).not.toThrow();
  });

  it('tolera até o acesso a window.localStorage lançar exceção', () => {
    const unavailable = createSafeStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(unavailable.read('k', schema)).toBeNull();
    expect(unavailable.write('k', { token: 'abc' })).toBe(false);
  });

  it('ignora valor corrompido ou fora do schema', () => {
    window.localStorage.setItem('json-quebrado', '{"token":');
    window.localStorage.setItem('forma-errada', JSON.stringify({ token: 42 }));

    expect(storage.read('json-quebrado', schema)).toBeNull();
    expect(storage.read('forma-errada', schema)).toBeNull();
    expect(storage.read('ausente', schema)).toBeNull();
  });
});
