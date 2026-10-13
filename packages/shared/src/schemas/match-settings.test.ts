import { describe, expect, it } from 'vitest';

import { DRAWING_SECONDS_OPTIONS, STORY_SECONDS_OPTIONS } from '../constants';
import { drawingSecondsFor } from '../domain/match-settings';
import { matchSettingsSchema } from './match-settings';

const valid = {
  mode: 'collaborative',
  panelCount: { kind: 'per_player' },
  drawingSeconds: 90,
  showPreviousPanels: false,
  authorDrawsLast: true,
  individual: { panelsPerStory: 4, storySeconds: 300 },
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

  it('R18: o tempo por quadrinho vai até 10 minutos, nunca além', () => {
    expect(matchSettingsSchema.safeParse({ ...valid, drawingSeconds: 600 }).success).toBe(true);
    expect(matchSettingsSchema.safeParse({ ...valid, drawingSeconds: 660 }).success).toBe(false);
  });

  it('R18: showPreviousPanels é obrigatório e booleano', () => {
    expect(matchSettingsSchema.safeParse({ ...valid, showPreviousPanels: true }).success).toBe(
      true,
    );
    expect(matchSettingsSchema.safeParse({ ...valid, showPreviousPanels: 'sim' }).success).toBe(
      false,
    );
    const withoutIt = { mode: valid.mode, panelCount: valid.panelCount, drawingSeconds: 90 };
    expect(matchSettingsSchema.safeParse(withoutIt).success).toBe(false);
  });

  it('R18: authorDrawsLast é obrigatório e booleano', () => {
    expect(matchSettingsSchema.safeParse({ ...valid, authorDrawsLast: false }).success).toBe(true);
    expect(matchSettingsSchema.safeParse({ ...valid, authorDrawsLast: 0 }).success).toBe(false);
    const withoutIt = {
      mode: valid.mode,
      panelCount: valid.panelCount,
      drawingSeconds: 90,
      showPreviousPanels: false,
    };
    expect(matchSettingsSchema.safeParse(withoutIt).success).toBe(false);
  });

  it("R21: aceita mode 'individual' e recusa outro modo", () => {
    expect(matchSettingsSchema.safeParse({ ...valid, mode: 'individual' }).success).toBe(true);
    expect(matchSettingsSchema.safeParse({ ...valid, mode: 'solo' }).success).toBe(false);
  });

  it('R18: individual.panelsPerStory aceita 2 a 6, inteiro', () => {
    const withPanels = (panelsPerStory: number) => ({
      ...valid,
      individual: { ...valid.individual, panelsPerStory },
    });
    for (const value of [2, 6]) {
      expect(matchSettingsSchema.safeParse(withPanels(value)).success, String(value)).toBe(true);
    }
    for (const value of [1, 7, 3.5]) {
      expect(matchSettingsSchema.safeParse(withPanels(value)).success, String(value)).toBe(false);
    }
  });

  it('R18: individual.storySeconds aceita só as opções', () => {
    const withSeconds = (storySeconds: number) => ({
      ...valid,
      individual: { ...valid.individual, storySeconds },
    });
    for (const storySeconds of STORY_SECONDS_OPTIONS) {
      expect(matchSettingsSchema.safeParse(withSeconds(storySeconds)).success).toBe(true);
    }
    for (const storySeconds of [90, 420, 660]) {
      expect(matchSettingsSchema.safeParse(withSeconds(storySeconds)).success).toBe(false);
    }
  });

  it('R18: individual é obrigatório, mesmo no modo colaborativo', () => {
    const withoutIt = {
      mode: valid.mode,
      panelCount: valid.panelCount,
      drawingSeconds: 90,
      showPreviousPanels: false,
      authorDrawsLast: true,
    };
    expect(matchSettingsSchema.safeParse(withoutIt).success).toBe(false);
  });

  it('R38, R65: o tempo de desenho é por quadro no colaborativo e da história no individual', () => {
    expect(drawingSecondsFor(valid)).toBe(90);
    expect(drawingSecondsFor({ ...valid, mode: 'individual' })).toBe(300);
  });
});
