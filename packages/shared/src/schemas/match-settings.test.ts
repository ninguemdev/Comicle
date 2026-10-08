import { describe, expect, it } from 'vitest';

import { DRAWING_SECONDS_OPTIONS } from '../constants';
import { matchSettingsSchema } from './match-settings';

const valid = {
  mode: 'collaborative',
  panelCount: { kind: 'per_player' },
  drawingSeconds: 90,
} as const;

function withFixed(value: number) {
  return { ...valid, panelCount: { kind: 'fixed', value } };
}

describe('matchSettingsSchema', () => {
  it('R18: aceita a configuração por jogador', () => {
    expect(matchSettingsSchema.parse(valid)).toEqual(valid);
  });

  it('R18: quantidade fixa aceita 2 a 12', () => {
    expect(matchSettingsSchema.safeParse(withFixed(2)).success).toBe(true);
    expect(matchSettingsSchema.safeParse(withFixed(12)).success).toBe(true);
  });

  it('R18: quantidade fixa fora de 2–12 ou fracionária é rejeitada', () => {
    for (const value of [1, 13, 4.5]) {
      expect(matchSettingsSchema.safeParse(withFixed(value)).success, String(value)).toBe(false);
    }
  });

  it('R18: drawingSeconds aceita só as opções', () => {
    for (const drawingSeconds of DRAWING_SECONDS_OPTIONS) {
      expect(matchSettingsSchema.safeParse({ ...valid, drawingSeconds }).success).toBe(true);
    }
    expect(matchSettingsSchema.safeParse({ ...valid, drawingSeconds: 100 }).success).toBe(false);
  });

  it("R21: mode 'individual' é rejeitado", () => {
    expect(matchSettingsSchema.safeParse({ ...valid, mode: 'individual' }).success).toBe(false);
  });
});
