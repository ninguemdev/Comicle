import { DRAWING_SECONDS_DEFAULT, type MatchSettings } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { getGameMode } from '../registry';
import { collaborativeMode } from './collaborative-mode';

const perPlayer: MatchSettings = {
  mode: 'collaborative',
  panelCount: { kind: 'per_player' },
  drawingSeconds: DRAWING_SECONDS_DEFAULT,
};

const fixed = (value: number): MatchSettings => ({
  ...perPlayer,
  panelCount: { kind: 'fixed', value },
});

function errorCodeOf(settings: MatchSettings): string | undefined {
  const result = collaborativeMode.validateSettings(settings);
  return result.ok ? undefined : result.error.code;
}

describe('collaborativeMode', () => {
  it('R20: per_player com 7 participantes → 7 rodadas; fixed(3) → 3', () => {
    expect(collaborativeMode.totalRounds(perPlayer, 7)).toBe(7);
    expect(collaborativeMode.totalRounds(fixed(3), 7)).toBe(3);
  });

  it('R34/R35: só a rodada 0 começa sem leitura', () => {
    expect(collaborativeMode.hasReadingPhase(0)).toBe(false);
    expect(collaborativeMode.hasReadingPhase(1)).toBe(true);
    expect(collaborativeMode.hasReadingPhase(11)).toBe(true);
  });

  it('R18: aceita configurações válidas', () => {
    expect(errorCodeOf(perPlayer)).toBeUndefined();
    expect(errorCodeOf(fixed(2))).toBeUndefined();
    expect(errorCodeOf(fixed(12))).toBeUndefined();
  });

  it('R18: rejeita quantidade fixa fora da faixa e tempo fora das opções', () => {
    expect(errorCodeOf(fixed(1))).toBe('INVALID_PAYLOAD');
    expect(errorCodeOf(fixed(13))).toBe('INVALID_PAYLOAD');
    expect(errorCodeOf(fixed(2.5))).toBe('INVALID_PAYLOAD');
    expect(errorCodeOf({ ...perPlayer, drawingSeconds: 100 })).toBe('INVALID_PAYLOAD');
  });

  it('R21: rejeita o modo individual', () => {
    expect(errorCodeOf({ ...perPlayer, mode: 'individual' })).toBe('INVALID_PAYLOAD');
  });

  it('R31: buildPlan usa a distribuição colaborativa', () => {
    const plan = collaborativeMode.buildPlan(['ana', 'bruno'], 2);
    expect(plan.assignments).toEqual([
      { ana: 1, bruno: 0 },
      { ana: 0, bruno: 1 },
    ]);
  });
});

describe('registry', () => {
  it('registra o modo colaborativo', () => {
    expect(getGameMode('collaborative')).toBe(collaborativeMode);
  });

  it('R21: o modo individual ainda não existe', () => {
    expect(() => getGameMode('individual')).toThrow(
      expect.objectContaining({ code: 'INVALID_PAYLOAD' }),
    );
  });
});
