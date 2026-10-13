import { describe, expect, it } from 'vitest';

import { FILL_TOLERANCE, floodFill, type Pixels } from './flood-fill';

const RED = '#E53935';

/** Cells of the pictures below, as RGB: `-` is a light gray, like the antialiased edge of a line. */
const CELLS: Readonly<Record<string, string>> = {
  '.': '255,255,255',
  '#': '0,0,0',
  '-': [255 - FILL_TOLERANCE - 40, 255 - FILL_TOLERANCE - 40, 255 - FILL_TOLERANCE - 40].join(),
  R: '229,57,53',
};

/** A canvas from rows of characters (see CELLS). */
function pixelsFrom(rows: string[]): Pixels {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const rgb = (CELLS[row.charAt(x)] ?? '').split(',').map(Number);
      data.set([...rgb, 255], (y * width + x) * 4);
    }
  });
  return { data, width, height: rows.length };
}

/** The canvas back as characters; `?` for a color not in CELLS. */
function render(pixels: Pixels): string[] {
  const names = new Map(Object.entries(CELLS).map(([cell, rgb]) => [rgb, cell]));
  const rows: string[] = [];
  for (let y = 0; y < pixels.height; y++) {
    let row = '';
    for (let x = 0; x < pixels.width; x++) {
      const offset = (y * pixels.width + x) * 4;
      const rgb = pixels.data.slice(offset, offset + 3).join();
      row += rgb === CELLS['-'] ? '?' : (names.get(rgb) ?? '?');
    }
    rows.push(row);
  }
  return rows;
}

describe('floodFill', () => {
  it('pinta a área fechada em volta do ponto e para nas linhas', () => {
    const pixels = pixelsFrom([
      '.......', //
      '.#####.',
      '.#...#.',
      '.#...#.',
      '.#####.',
      '.......',
    ]);

    expect(floodFill(pixels, { x: 3, y: 2 }, RED)).toBe(true);
    // The 1 px rim also reaches into the line, which keeps the fill tight against strokes.
    expect(render(pixels)).toEqual([
      '.......', //
      '.#RRR#.',
      '.RRRRR.',
      '.RRRRR.',
      '.#RRR#.',
      '.......',
    ]);
  });

  it('cobre a borda suavizada do traço em vez de deixar um halo claro', () => {
    const pixels = pixelsFrom([
      '#######', //
      '#-----#',
      '#-...-#',
      '#-----#',
      '#######',
    ]);

    floodFill(pixels, { x: 3, y: 2 }, RED);

    expect(render(pixels)).toEqual([
      '#######', //
      '#?RRR?#',
      '#RRRRR#',
      '#?RRR?#',
      '#######',
    ]);
  });

  it('vaza por uma abertura na linha, como um balde de verdade', () => {
    const pixels = pixelsFrom([
      '.....', //
      '.#.#.',
      '.###.',
    ]);

    floodFill(pixels, { x: 2, y: 1 }, RED);

    expect(render(pixels)[0]).toBe('RRRRR');
  });

  it('não muda nada na mesma cor, fora da tela ou com cor inválida', () => {
    const pixels = pixelsFrom(['...', '...']);
    const before = pixels.data.slice();

    expect(floodFill(pixels, { x: 1, y: 1 }, '#FFFFFF')).toBe(false);
    expect(floodFill(pixels, { x: -1, y: 0 }, RED)).toBe(false);
    expect(floodFill(pixels, { x: 3, y: 0 }, RED)).toBe(false);
    expect(floodFill(pixels, { x: 0, y: 0 }, 'red')).toBe(false);
    expect(pixels.data).toEqual(before);
  });

  it('usa o pixel sob o ponto, com coordenadas fracionárias', () => {
    const pixels = pixelsFrom(['.#.']);

    floodFill(pixels, { x: 1.9, y: 0.4 }, RED);

    expect(render(pixels)).toEqual(['RRR']);
  });
});
