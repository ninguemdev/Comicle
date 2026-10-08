import { describe, expect, it } from 'vitest';

import { codePointLength, normalizeText } from './text';

describe('normalizeText', () => {
  it('R1: apara e junta espaços repetidos em um', () => {
    expect(normalizeText('  Ana    Maria  ')).toBe('Ana Maria');
  });

  it('R1: quebras de linha e tabulações contam como espaço', () => {
    expect(normalizeText('Ana\t\n\r\nMaria')).toBe('Ana Maria');
  });

  it('R1: remove caracteres de controle', () => {
    expect(normalizeText('A\u0000n\u0007a\u007f')).toBe('Ana');
  });

  it('R1: remover um controle não deixa espaço duplicado', () => {
    expect(normalizeText('Ana \u0000 Maria')).toBe('Ana Maria');
  });

  it('preserva emojis compostos (sem remover o ZWJ)', () => {
    expect(normalizeText(' 👩‍🚀 ')).toBe('👩‍🚀');
  });
});

describe('codePointLength', () => {
  it('R1: emoji simples conta como 1', () => {
    expect(codePointLength('😀')).toBe(1);
    expect(codePointLength('ação')).toBe(4);
  });
});
