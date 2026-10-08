import { describe, expect, it } from 'vitest';

import { nicknameSchema, themeDraftSchema, themeSchema } from './text';

describe('nicknameSchema', () => {
  it('R1: nickname é normalizado', () => {
    expect(nicknameSchema.parse('  Super\u0007   Gato \n')).toBe('Super Gato');
  });

  it('R1: vazio e só espaços são rejeitados', () => {
    expect(nicknameSchema.safeParse('').success).toBe(false);
    expect(nicknameSchema.safeParse(' \t\n ').success).toBe(false);
  });

  it('R1: aceita 20 code points e rejeita 21', () => {
    expect(nicknameSchema.safeParse('a'.repeat(20)).success).toBe(true);
    expect(nicknameSchema.safeParse('a'.repeat(21)).success).toBe(false);
  });

  it('R1: emoji conta como 1 code point', () => {
    expect(nicknameSchema.safeParse('😀'.repeat(20)).success).toBe(true);
    expect(nicknameSchema.safeParse('😀'.repeat(21)).success).toBe(false);
  });

  it('R1: o limite vale depois da normalização', () => {
    expect(nicknameSchema.safeParse(`   ${'a'.repeat(20)}   `).success).toBe(true);
  });

  it('rejeita o que não é texto', () => {
    expect(nicknameSchema.safeParse(42).success).toBe(false);
  });
});

describe('themeSchema', () => {
  it('R27: tema é normalizado', () => {
    expect(themeSchema.parse('  Um gato   na\npresidência ')).toBe('Um gato na presidência');
  });

  it('R27: rejeita 2 caracteres e aceita 3', () => {
    expect(themeSchema.safeParse('ab').success).toBe(false);
    expect(themeSchema.safeParse('  ab  ').success).toBe(false);
    expect(themeSchema.safeParse('abc').success).toBe(true);
  });

  it('R27: aceita 140 caracteres e rejeita 141', () => {
    expect(themeSchema.safeParse('a'.repeat(140)).success).toBe(true);
    expect(themeSchema.safeParse('a'.repeat(141)).success).toBe(false);
  });
});

describe('themeDraftSchema', () => {
  it('R28: rascunho pode estar vazio ou curto', () => {
    expect(themeDraftSchema.parse('')).toBe('');
    expect(themeDraftSchema.parse(' ab ')).toBe('ab');
  });

  it('R28: rascunho respeita o máximo do tema', () => {
    expect(themeDraftSchema.safeParse('a'.repeat(141)).success).toBe(false);
  });
});
