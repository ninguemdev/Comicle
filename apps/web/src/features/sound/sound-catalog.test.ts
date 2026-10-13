import { describe, expect, it } from 'vitest';

import { MAX_SOUND_SECONDS, note, recipeDuration, SOUND_IDS, SOUNDS } from './sound-catalog';

/** What a person hears, and what an exponential ramp can reach (it cannot pass through 0). */
const AUDIBLE_MIN_HZ = 20;
const AUDIBLE_MAX_HZ = 20_000;

describe('catálogo de sons', () => {
  it('note: Lá4 = 440 Hz, oitavas dobram, Dó5 ≈ 523,25 Hz', () => {
    expect(note('A4')).toBe(440);
    expect(note('A5')).toBe(880);
    expect(note('C5')).toBeCloseTo(523.25, 2);
    expect(note('E5')).toBeCloseTo(659.26, 2);
  });

  it.each(SOUND_IDS)('%s: curto, audível e com nível dentro de 0–1', (id) => {
    const recipe = SOUNDS[id];

    expect(recipe.length).toBeGreaterThan(0);
    expect(recipeDuration(recipe)).toBeLessThanOrEqual(MAX_SOUND_SECONDS);
    for (const layer of recipe) {
      for (const frequency of [layer.from, layer.to ?? layer.from]) {
        expect(frequency).toBeGreaterThanOrEqual(AUDIBLE_MIN_HZ);
        expect(frequency).toBeLessThanOrEqual(AUDIBLE_MAX_HZ);
      }
      expect(layer.start).toBeGreaterThanOrEqual(0);
      // Long enough for the attack, so the envelope reaches its peak and fades out.
      expect(layer.duration).toBeGreaterThanOrEqual(0.02);
      expect(layer.gain).toBeGreaterThan(0);
      expect(layer.gain).toBeLessThanOrEqual(1);
    }
  });

  it('recipeDuration é o fim da última camada', () => {
    expect(recipeDuration(SOUNDS.warning)).toBeCloseTo(0.26);
    expect(recipeDuration([])).toBe(0);
  });
});
