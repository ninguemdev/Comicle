import { themeSchema } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { FALLBACK_THEMES } from './fallback-themes';

describe('FALLBACK_THEMES', () => {
  it('R30: tem ao menos 40 temas, sem repetição', () => {
    expect(FALLBACK_THEMES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(FALLBACK_THEMES).size).toBe(FALLBACK_THEMES.length);
  });

  it('R27: todo tema reserva é um tema válido e já normalizado', () => {
    for (const theme of FALLBACK_THEMES) {
      expect(themeSchema.parse(theme), theme).toBe(theme);
    }
  });
});
