import {
  nicknameSchema,
  randomAvatar,
  sanitizeAvatar,
  type PlayerProfile,
  type Rng,
} from '@comicle/shared';
import { z } from 'zod';
import { create } from 'zustand';

import { cryptoRng } from '../lib/random';
import { STORAGE_KEYS, storage as defaultStorage, type SafeStorage } from '../lib/storage';

/** R2: a saved avatar whose IDs left the catalog keeps its valid parts instead of being lost. */
const storedProfileSchema = z.object({
  nickname: nicknameSchema,
  avatar: z.unknown().transform((avatar) => sanitizeAvatar(avatar)),
});

interface ProfileState {
  /** The nickname stays empty until the player saves one (R4). */
  profile: PlayerProfile;
  /** Whether `comicle.profile` held a valid profile, or one was saved in this visit. */
  saved: boolean;
  actions: {
    save(profile: PlayerProfile): void;
  };
}

export function createProfileStore(storage: SafeStorage, rng: Rng) {
  const stored = storage.read(STORAGE_KEYS.profile, storedProfileSchema);

  return create<ProfileState>()((set) => ({
    // R4: the first visit gets a random avatar and an empty nickname.
    profile: stored ?? { nickname: '', avatar: randomAvatar(rng) },
    saved: stored !== null,
    actions: {
      save(profile) {
        storage.write(STORAGE_KEYS.profile, profile);
        set({ profile, saved: true });
      },
    },
  }));
}

export const useProfileStore = createProfileStore(defaultStorage, cryptoRng);
