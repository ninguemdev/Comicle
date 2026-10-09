import {
  DRAWING_SECONDS_DEFAULT,
  HOST_TRANSFER_GRACE_MS,
  ROUND_CLOSING_MS,
  THEME_WRITING_SECONDS,
  type MatchSettings,
} from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { defaultGameTiming, fastGameTiming, gameTimingFor, readingSeconds } from './game-timing';

const settings: MatchSettings = {
  mode: 'collaborative',
  panelCount: { kind: 'per_player' },
  drawingSeconds: DRAWING_SECONDS_DEFAULT,
};

describe('game timing', () => {
  it('R35: leitura de 15 s + 5 s por quadro já desenhado, até 60 s', () => {
    expect(readingSeconds(0)).toBe(15);
    expect(readingSeconds(1)).toBe(20);
    expect(readingSeconds(5)).toBe(40);
    expect(readingSeconds(9)).toBe(60);
    expect(readingSeconds(20)).toBe(60);
  });

  it('o perfil default usa as constantes das regras', () => {
    expect(defaultGameTiming.themeWritingMs).toBe(THEME_WRITING_SECONDS * 1000);
    expect(defaultGameTiming.readingMs(1)).toBe(20_000);
    expect(defaultGameTiming.drawingMs({ ...settings, drawingSeconds: 45 })).toBe(45_000);
    expect(defaultGameTiming.roundClosingMs).toBe(ROUND_CLOSING_MS);
    expect(defaultGameTiming.hostTransferGraceMs).toBe(HOST_TRANSFER_GRACE_MS);
  });

  it('o perfil fast encurta as fases da partida, mas não as graças da sala', () => {
    expect(fastGameTiming.themeWritingMs).toBeLessThan(defaultGameTiming.themeWritingMs);
    expect(fastGameTiming.drawingMs(settings)).toBeLessThan(defaultGameTiming.drawingMs(settings));
    expect(fastGameTiming.readingMs(5)).toBeLessThan(defaultGameTiming.readingMs(5));
    expect(fastGameTiming.hostTransferGraceMs).toBe(defaultGameTiming.hostTransferGraceMs);
  });

  it('gameTimingFor escolhe o perfil da configuração', () => {
    expect(gameTimingFor('default')).toBe(defaultGameTiming);
    expect(gameTimingFor('fast')).toBe(fastGameTiming);
  });
});
