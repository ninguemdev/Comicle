import { describe, expect, it } from 'vitest';

import {
  columnsForWidth,
  computeComicLayout,
  MIN_PANEL_WIDTH,
  panelWidthFor,
  splitIntoRows,
  type MaxColumns,
} from './compute-comic-layout';

describe('computeComicLayout', () => {
  it.each([
    [3, 2, [2, 1]],
    [3, 3, [3]],
    [4, 2, [2, 2]],
    [4, 3, [2, 2]],
    [5, 2, [2, 2, 1]],
    [5, 3, [3, 2]],
    [6, 2, [2, 2, 2]],
    [6, 3, [3, 3]],
    [7, 2, [2, 2, 2, 1]],
    [7, 3, [3, 2, 2]],
    [8, 2, [2, 2, 2, 2]],
    [8, 3, [3, 3, 2]],
  ] as const)(
    '%d quadros com até %d colunas → %o (tabela de interface.md §3)',
    (n, columns, rows) => {
      expect(computeComicLayout(n, columns)).toEqual(rows);
    },
  );

  it('1 quadro é uma linha; 0 quadros, nenhuma', () => {
    expect(computeComicLayout(1, 3)).toEqual([1]);
    expect(computeComicLayout(0, 2)).toEqual([]);
  });

  const allColumns: MaxColumns[] = [1, 2, 3];
  it.each(allColumns)(
    'com até %d colunas, de 1 a 12 quadros: soma = n, linhas não crescentes, diferença máxima de 1',
    (columns) => {
      for (let n = 1; n <= 12; n++) {
        const rows = computeComicLayout(n, columns);
        expect(rows.reduce((sum, row) => sum + row, 0)).toBe(n);
        expect(rows.length).toBe(Math.ceil(n / columns));
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i]).toBeLessThanOrEqual(rows[i - 1] ?? 0);
        }
        expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(1);
        expect(Math.max(...rows)).toBeLessThanOrEqual(columns);
      }
    },
  );
});

describe('splitIntoRows', () => {
  it('corta na ordem de leitura', () => {
    expect(splitIntoRows([1, 2, 3, 4, 5], [2, 2, 1])).toEqual([[1, 2], [3, 4], [5]]);
    expect(splitIntoRows([], [])).toEqual([]);
  });
});

describe('columnsForWidth', () => {
  it.each([
    [360, 6, 1],
    [479, 4, 1],
    [480, 6, 2],
    [1024, 6, 2],
    [1025, 6, 3],
    [1440, 4, 2],
    [1440, 9, 3],
  ])('largura %d com %d quadros → %d colunas', (width, n, expected) => {
    expect(columnsForWidth(width, n)).toBe(expected);
  });
});

describe('panelWidthFor', () => {
  const sizing = { gutter: 16, captionHeight: 0 };

  it('cabe na largura quando há altura de sobra', () => {
    // 2 columns: (1000 - 16) / 2 = 492.
    expect(panelWidthFor({ width: 1000, height: 2000 }, [2, 1], sizing)).toBe(492);
  });

  it('cabe na altura quando ela é o limite, mantendo 4:3', () => {
    // 2 rows of (616 - 16) / 2 = 300 px → 400 px wide.
    expect(panelWidthFor({ width: 1000, height: 616 }, [2, 2], sizing)).toBe(400);
  });

  it('desconta a linha de créditos de cada quadro', () => {
    const withCredits = { gutter: 16, captionHeight: 24 };
    // Rows of 324 px, 300 for the panel → 400 px wide.
    expect(panelWidthFor({ width: 1000, height: 664 }, [2, 2], withCredits)).toBe(400);
  });

  it('abaixo do mínimo, para de encolher (a página rola)', () => {
    expect(panelWidthFor({ width: 1200, height: 300 }, [3, 3, 3, 3], sizing)).toBe(MIN_PANEL_WIDTH);
    // A narrow page cannot reach the minimum: the row width wins.
    expect(panelWidthFor({ width: 120, height: 100 }, [1, 1, 1], sizing)).toBe(120);
  });

  it('sem quadros, largura 0', () => {
    expect(panelWidthFor({ width: 500, height: 500 }, [], sizing)).toBe(0);
  });
});
