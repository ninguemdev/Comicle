import { defaultAvatar, playerProfileSchema, type PlayerProfile } from '@comicle/shared';
import { create } from 'zustand';

import { STORAGE_KEYS, storage as defaultStorage, type SafeStorage } from '../lib/storage';

interface ProfileState {
  /** The nickname stays empty until the player saves one (R4). */
  profile: PlayerProfile;
  /** Whether `comicle.profile` held a valid profile, or one was saved in this visit. */
  saved: boolean;
  actions: {
    save(profile: PlayerProfile): void;
  };
}

export function createProfileStore(storage: SafeStorage) {
  const stored = storage.read(STORAGE_KEYS.profile, playerProfileSchema);

  return create<ProfileState>()((set) => ({
    // First visit: empty nickname; the random avatar of R4 arrives with the catalog (T07).
    profile: stored ?? { nickname: '', avatar: defaultAvatar() },
    saved: stored !== null,
    actions: {
      save(profile) {
        storage.write(STORAGE_KEYS.profile, profile);
        set({ profile, saved: true });
      },
    },
  }));
}

export const useProfileStore = createProfileStore(defaultStorage);
