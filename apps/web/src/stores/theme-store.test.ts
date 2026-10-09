import { afterEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS, storage } from '../lib/storage';
import { createThemeStore } from './theme-store';

describe('theme-store', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('primeira visita segue o sistema: nenhum data-theme', () => {
    const root = document.createElement('html');
    const store = createThemeStore(storage, root);

    expect(store.getState().preference).toBe('system');
    expect(root.dataset.theme).toBeUndefined();
  });

  it('escolher escuro ou claro grava a escolha e marca o <html>', () => {
    const root = document.createElement('html');
    const store = createThemeStore(storage, root);

    store.getState().actions.choose('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('"dark"');

    store.getState().actions.choose('light');
    expect(root.dataset.theme).toBe('light');
  });

  it('voltar a "Sistema" tira a marca e apaga a escolha salva', () => {
    const root = document.createElement('html');
    const store = createThemeStore(storage, root);
    store.getState().actions.choose('dark');

    store.getState().actions.choose('system');

    expect(root.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
  });

  it('a escolha salva é aplicada ao abrir; valor corrompido vira "Sistema"', () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, '"dark"');
    const root = document.createElement('html');
    expect(createThemeStore(storage, root).getState().preference).toBe('dark');
    expect(root.dataset.theme).toBe('dark');

    window.localStorage.setItem(STORAGE_KEYS.theme, '"roxo"');
    const other = document.createElement('html');
    expect(createThemeStore(storage, other).getState().preference).toBe('system');
    expect(other.dataset.theme).toBeUndefined();
  });
});
