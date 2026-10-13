import { describe, expect, it } from 'vitest';

import { defaultAvatar, type PanelRef } from '@comicle/shared';

import {
  COMIC_EXPORT,
  comicCredits,
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

  it('cola os quadros: vizinhos dividem a borda, sem calha entre linhas nem colunas', () => {
    const { panelWidth, panelHeight, margin } = COMIC_EXPORT;
    const plan = planComicExport(6, 1, 1);

    expect(plan.width).toBe(3 * panelWidth + 2 * margin);
    const xs = plan.panels.map((panel) => panel.x);
    const ys = plan.panels.map((panel) => panel.y);
    expect(xs).toEqual([0, 1, 2, 0, 1, 2].map((column) => margin + column * panelWidth));
    expect((ys[3] ?? 0) - (ys[0] ?? 0)).toBe(panelHeight);
  });

  it('centraliza a linha incompleta, com os quadros ainda colados', () => {
    const { panelWidth, margin } = COMIC_EXPORT;
    const plan = planComicExport(5, 2, 1);

    const firstRow = plan.panels.slice(0, 3);
    const secondRow = plan.panels.slice(3);
    expect(new Set(firstRow.map((panel) => panel.y)).size).toBe(1);
    expect(secondRow.map((panel) => panel.x)).toEqual([
      margin + panelWidth / 2,
      margin + panelWidth / 2 + panelWidth,
    ]);
  });

  it('os créditos ficam abaixo dos quadros, antes do rodapé', () => {
    const { panelHeight, creditsGap, creditLine } = COMIC_EXPORT;
    const plan = planComicExport(4, 1, 2);
    const lastRowTop = plan.panels[3]?.y ?? 0;

    expect(plan.creditTops).toEqual([
      lastRowTop + panelHeight + creditsGap,
      lastRowTop + panelHeight + creditsGap + creditLine,
    ]);
    expect(plan.footerTop).toBe((plan.creditTops[1] ?? 0) + creditLine);
    expect(plan.height).toBeGreaterThan(plan.footerTop);
  });

  it('o tema empurra os quadros para baixo, e a página cresce com eles', () => {
    const oneLine = planComicExport(3, 1, 1);
    const threeLines = planComicExport(3, 3, 1);
    const extra = 2 * COMIC_EXPORT.themeLine;

    expect(threeLines.themeTops).toHaveLength(3);
    expect((threeLines.panels[0]?.y ?? 0) - (oneLine.panels[0]?.y ?? 0)).toBe(extra);
    expect(threeLines.height - oneLine.height).toBe(extra);
    expect(threeLines.footerTop).toBeLessThan(threeLines.height);
  });
});

describe('comicCredits', () => {
  it('R55: lista o número e o artista de cada quadro, em ordem de leitura', () => {
    const panel = (position: number, nickname: string): PanelRef => ({
      panelId: `p${String(position)}`,
      position,
      artist: { playerId: nickname, nickname, avatar: defaultAvatar() },
      status: 'complete',
    });

    expect(comicCredits([panel(1, 'Caio'), panel(0, 'Bia'), panel(2, 'Ana')])).toBe(
      'Quadros: 1 Bia · 2 Caio · 3 Ana',
    );
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
