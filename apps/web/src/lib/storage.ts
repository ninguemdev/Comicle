import type { z } from 'zod';

/** localStorage keys (docs/modelo-de-dados.md). */
export const STORAGE_KEYS = {
  session: 'comicle.session',
  profile: 'comicle.profile',
  theme: 'comicle.theme',
} as const;

type Backend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SafeStorage {
  /** The stored value when it parses and matches `schema`; `null` otherwise. */
  read<T>(key: string, schema: z.ZodType<T>): T | null;
  /** `false` when the value could not be saved. */
  write(key: string, value: unknown): boolean;
  remove(key: string): void;
}

/**
 * Even reading `window.localStorage` may throw (private mode, blocked site data, full quota),
 * so every access is guarded and the game keeps working without persistence.
 */
export function createSafeStorage(getBackend: () => Backend): SafeStorage {
  return {
    read(key, schema) {
      try {
        const raw = getBackend().getItem(key);
        if (raw === null) {
          return null;
        }
        const result = schema.safeParse(JSON.parse(raw));
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        getBackend().setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getBackend().removeItem(key);
      } catch {
        // Nothing to clean up when storage is unavailable.
      }
    },
  };
}

export const storage = createSafeStorage(() => window.localStorage);
