import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SoundEngine } from '../features/sound/sound-engine';
import { STORAGE_KEYS, storage } from '../lib/storage';
import { createSoundStore, DEFAULT_SOUND_SETTINGS } from './sound-store';

function fakeEngine() {
  const setLevel = vi.fn<SoundEngine['setLevel']>();
  const engine: SoundEngine = { play: vi.fn(), unlock: vi.fn(), setLevel };
  return { engine, setLevel };
}

describe('sound-store', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('primeira visita: ligado em 60 %, e o motor já recebe esse nível', () => {
    const { engine, setLevel } = fakeEngine();
    const store = createSoundStore(storage, engine);

    expect(store.getState()).toMatchObject(DEFAULT_SOUND_SETTINGS);
    expect(setLevel.mock.calls[0]?.[0]).toBeCloseTo(0.8 * 0.36, 5);
  });

  it('volume e silenciar são gravados e voltam ao recarregar', () => {
    const store = createSoundStore(storage, fakeEngine().engine);
    store.getState().actions.setVolume(0.25);
    store.getState().actions.toggleMuted();

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.sound) ?? '{}')).toEqual({
      volume: 0.25,
      muted: true,
    });
    const { engine, setLevel } = fakeEngine();
    const reloaded = createSoundStore(storage, engine);
    expect(reloaded.getState()).toMatchObject({ volume: 0.25, muted: true });
    expect(setLevel).toHaveBeenCalledWith(0);
  });

  it('mexer no volume tira o silêncio; o volume fica entre 0 e 1', () => {
    const store = createSoundStore(storage, fakeEngine().engine);
    store.getState().actions.toggleMuted();

    store.getState().actions.setVolume(2);

    expect(store.getState()).toMatchObject({ volume: 1, muted: false });
  });

  it('valor gravado inválido volta ao padrão', () => {
    window.localStorage.setItem(STORAGE_KEYS.sound, JSON.stringify({ volume: 9, muted: 'sim' }));

    expect(createSoundStore(storage, fakeEngine().engine).getState()).toMatchObject(
      DEFAULT_SOUND_SETTINGS,
    );
  });
});
