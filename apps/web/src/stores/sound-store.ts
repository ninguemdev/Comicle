import { z } from 'zod';
import { create } from 'zustand';

import { masterLevel, soundEngine, type SoundEngine } from '../features/sound/sound-engine';
import { STORAGE_KEYS, storage as defaultStorage, type SafeStorage } from '../lib/storage';

// Volume and mute for the whole site (docs/sons.md §4), remembered per browser.

/** On at 60 % (D47). */
export const DEFAULT_SOUND_SETTINGS = { volume: 0.6, muted: false } as const;

const soundSettingsSchema = z.object({
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
});

export type SoundSettings = z.infer<typeof soundSettingsSchema>;

interface SoundState extends SoundSettings {
  actions: {
    /** 0–1. Moving the volume also unmutes: the player clearly wants to hear something. */
    setVolume(volume: number): void;
    toggleMuted(): void;
  };
}

/** Reads the saved choice and hands it to the engine at once, before any sound plays. */
export function createSoundStore(storage: SafeStorage, engine: SoundEngine) {
  const initial = storage.read(STORAGE_KEYS.sound, soundSettingsSchema) ?? DEFAULT_SOUND_SETTINGS;
  engine.setLevel(masterLevel(initial.volume, initial.muted));

  return create<SoundState>()((set, get) => {
    function apply(next: SoundSettings): void {
      storage.write(STORAGE_KEYS.sound, next);
      engine.setLevel(masterLevel(next.volume, next.muted));
      set(next);
    }
    return {
      volume: initial.volume,
      muted: initial.muted,
      actions: {
        setVolume(volume) {
          apply({ volume: Math.min(Math.max(volume, 0), 1), muted: false });
        },
        toggleMuted() {
          const { volume, muted } = get();
          apply({ volume, muted: !muted });
        },
      },
    };
  });
}

export const useSoundStore = createSoundStore(defaultStorage, soundEngine);
