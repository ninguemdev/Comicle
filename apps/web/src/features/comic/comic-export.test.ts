import { describe, expect, it } from 'vitest';

import {
  COMIC_EXPORT,
  comicFileName,
  exportColumns,
  exportContentWidth,
  planComicExport,
  wrapText,
} from './comic-export';

/** Every character is 10 px wide. */
const measure = (text: string) => text.length * 10;

describe('wrapText', () => {
  it('quebra entre palavras sem passar da largura', () => {
    expect(wrapText('um gato prefeito da cidade', 120, measure, 4)).toEqual([
      'um gato',
      'prefeito da',
      'cidade',
    ]);
  });

  it('quebra uma palavra grande demais onde precisar', () => {
    expect(wrapText('supercalifragilístico', 80, measure, 4)).toEqual([
      'supercal',
      'ifragilí',
      'stico',
    ]);
  });

  it('para no limite de linhas e termina a última com reticências', () => {
    const lines = wrapText('a b c d e f g h', 30, measure, 2);

    expect(lines).toEqual(['a b', 'c…']);
    expect(lines.every((line) => measure(line) <= 30)).toBe(true);
  });

  it('ignora espaços repetidos e texto vazio', () => {
    expect(wrapText('  oi   gente  ', 200, measure, 4)).toEqual(['oi gente']);
    expect(wrapText('   ', 200, measure, 4)).toEqual([]);
  });
});

describe('planComicExport', () => {
  it('usa as colunas da HQ completa numa tela larga: 4 quadros em 2×2', () => {
    expect([1, 2, 3, 4, 5, 8].map(exportColumns)).toEqual([1, 2, 3, 2, 3, 3]);
  });

  it('centraliza a linha incompleta e deixa todos os quadros do mesmo tamanho', () => {
    const { panelWidth, gutter, margin } = COMIC_EXPORT;
    const plan = planComicExport(5, 2);

    expect(plan.width).toBe(exportContentWidth(5) + 2 * margin);
    const firstRow = plan.panels.slice(0, 3);
    const secondRow = plan.panels.slice(3);
    expect(new Set(firstRow.map((panel) => panel.y)).size).toBe(1);
    expect(secondRow).toHaveLength(2);
    // Two panels centered under three: half a panel (plus half a gutter) in from the margin.
    expect(secondRow[0]?.x).toBe(margin + (panelWidth + gutter) / 2);
  });

  it('o tema empurra os quadros para baixo, e a página cresce com eles', () => {
    const oneLine = planComicExport(3, 1);
    const threeLines = planComicExport(3, 3);
    const extra = 2 * COMIC_EXPORT.themeLine;

    expect(threeLines.themeTops).toHaveLength(3);
    expect((threeLines.panels[0]?.y ?? 0) - (oneLine.panels[0]?.y ?? 0)).toBe(extra);
    expect(threeLines.height - oneLine.height).toBe(extra);
    expect(threeLines.footerTop).toBeLessThan(threeLines.height);
  });
});

describe('comicFileName', () => {
  it('leva o número da história e o tema sem acentos nem símbolos', () => {
    expect(comicFileName('Um gato prefeito!', 1)).toBe('comicle-1-um-gato-prefeito.png');
    expect(comicFileName('  Pão de Açúcar & cia. ', 2)).toBe('comicle-2-pao-de-acucar-cia.png');
  });

  it('corta temas longos e não fica sem nome', () => {
    expect(comicFileName('a'.repeat(100), 3)).toBe(`comicle-3-${'a'.repeat(40)}.png`);
    expect(comicFileName('🐱🐶', 4)).toBe('comicle-4-historia.png');
  });
});
