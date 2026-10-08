import {
  defaultAvatar,
  isValidAvatar,
  randomAvatar,
  type PlayerProfile,
  type Rng,
} from '@comicle/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { createSafeStorage, STORAGE_KEYS, storage } from '../lib/storage';
import { createProfileStore } from './profile-store';

const PROFILE: PlayerProfile = { nickname: 'Ana', avatar: defaultAvatar() };

/** Always the last option, so the random avatar differs from the default one. */
const lastOptionRng: Rng = { nextInt: (maxExclusive) => maxExclusive - 1 };

describe('profile-store', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('R4: primeira visita começa com avatar aleatório, nickname vazio e sem perfil salvo', () => {
    const store = createProfileStore(storage, lastOptionRng);
    const { profile, saved } = store.getState();

    expect(profile.nickname).toBe('');
    expect(profile.avatar).toEqual(randomAvatar(lastOptionRng));
    expect(profile.avatar).not.toEqual(defaultAvatar());
    expect(isValidAvatar(profile.avatar)).toBe(true);
    expect(saved).toBe(false);
  });

  it('R4: salvar persiste em comicle.profile e a próxima visita recupera', () => {
    createProfileStore(storage, lastOptionRng).getState().actions.save(PROFILE);

    const nextVisit = createProfileStore(storage, lastOptionRng);

    expect(nextVisit.getState().profile).toEqual(PROFILE);
    expect(nextVisit.getState().saved).toBe(true);
  });

  it('R2: perfil salvo com IDs que saíram do catálogo é saneado, sem perder o resto', () => {
    const avatar = { ...defaultAvatar(), head: 'head-square', eyes: 'eyes-aposentados' };
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify({ nickname: 'Ana', avatar }));

    const store = createProfileStore(storage, lastOptionRng);

    expect(store.getState().profile).toEqual({
      nickname: 'Ana',
      avatar: { ...defaultAvatar(), head: 'head-square' },
    });
    expect(store.getState().saved).toBe(true);
  });

  it('ignora perfil corrompido', () => {
    window.localStorage.setItem(STORAGE_KEYS.profile, '{"nickname":"Ana","avatar":');

    const store = createProfileStore(storage, lastOptionRng);

    expect(store.getState().saved).toBe(false);
    expect(store.getState().profile.nickname).toBe('');
  });

  it('funciona sem localStorage disponível', () => {
    const blocked = createSafeStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const store = createProfileStore(blocked, lastOptionRng);

    store.getState().actions.save(PROFILE);

    expect(store.getState().profile).toEqual(PROFILE);
  });
});
