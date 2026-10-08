import { defaultAvatar, type PlayerProfile } from '@comicle/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { createSafeStorage, STORAGE_KEYS, storage } from '../lib/storage';
import { createProfileStore } from './profile-store';

const PROFILE: PlayerProfile = { nickname: 'Ana', avatar: defaultAvatar() };

describe('profile-store', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('R4: primeira visita começa com nickname vazio e sem perfil salvo', () => {
    const store = createProfileStore(storage);

    expect(store.getState().profile.nickname).toBe('');
    expect(store.getState().saved).toBe(false);
  });

  it('R4: salvar persiste em comicle.profile e a próxima visita recupera', () => {
    createProfileStore(storage).getState().actions.save(PROFILE);

    const nextVisit = createProfileStore(storage);

    expect(nextVisit.getState().profile).toEqual(PROFILE);
    expect(nextVisit.getState().saved).toBe(true);
  });

  it('ignora perfil corrompido', () => {
    window.localStorage.setItem(STORAGE_KEYS.profile, '{"nickname":"Ana","avatar":');

    const store = createProfileStore(storage);

    expect(store.getState().saved).toBe(false);
    expect(store.getState().profile.nickname).toBe('');
  });

  it('funciona sem localStorage disponível', () => {
    const blocked = createSafeStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const store = createProfileStore(blocked);

    store.getState().actions.save(PROFILE);

    expect(store.getState().profile).toEqual(PROFILE);
  });
});
