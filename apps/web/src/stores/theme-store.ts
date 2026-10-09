import { z } from 'zod';
import { create } from 'zustand';

import { STORAGE_KEYS, storage as defaultStorage, type SafeStorage } from '../lib/storage';

// Light or dark interface (interface.md §1, Modo escuro). "Sistema" is the CSS media query alone;
// an explicit choice is the data-theme attribute on <html>, which the stylesheet reads.

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const themePreferenceSchema = z.enum(THEME_PREFERENCES);

interface ThemeState {
  preference: ThemePreference;
  actions: {
    choose(preference: ThemePreference): void;
  };
}

/** The attribute the stylesheet reads; none means "follow the system". */
export function applyTheme(preference: ThemePreference, root: HTMLElement): void {
  if (preference === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
}

/** Reads the saved choice and applies it at once, before the first render. */
export function createThemeStore(storage: SafeStorage, root: HTMLElement) {
  const preference = storage.read(STORAGE_KEYS.theme, themePreferenceSchema) ?? 'system';
  applyTheme(preference, root);

  return create<ThemeState>()((set) => ({
    preference,
    actions: {
      choose(next) {
        if (next === 'system') {
          storage.remove(STORAGE_KEYS.theme);
        } else {
          storage.write(STORAGE_KEYS.theme, next);
        }
        applyTheme(next, root);
        set({ preference: next });
      },
    },
  }));
}

export const useThemeStore = createThemeStore(defaultStorage, document.documentElement);
