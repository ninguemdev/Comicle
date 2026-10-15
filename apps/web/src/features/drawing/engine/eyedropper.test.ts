import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { pickedColor, pixelUnder } from './eyedropper';
import { DRAWING_COLORS } from './palette';

describe('conta-gotas', () => {
  it('lê a cor no formato da paleta, para ela ficar marcada', () => {
    expect(pickedColor([229, 57, 53, 255])).toBe(DRAWING_COLORS.red);
    expect(pickedColor([0, 0, 0, 255])).toBe(DRAWING_COLORS.black);
    expect(pickedColor([18, 52, 171, 255])).toBe('#1234AB');
  });

  it('um pixel transparente vale como o fundo branco por baixo', () => {
    expect(pickedColor([0, 0, 0, 0])).toBe(DRAWING_COLORS.white);
    expect(pickedColor([0, 0, 0, 128])).toBe('#7F7F7F');
  });

  it('o ponto vira o pixel em que está, e a borda de baixo e da direita fica no último', () => {
    expect(pixelUnder({ x: 10.7, y: 3.2 })).toEqual({ x: 10, y: 3 });
    expect(pixelUnder({ x: PANEL_WIDTH, y: PANEL_HEIGHT })).toEqual({
      x: PANEL_WIDTH - 1,
      y: PANEL_HEIGHT - 1,
    });
  });
});
