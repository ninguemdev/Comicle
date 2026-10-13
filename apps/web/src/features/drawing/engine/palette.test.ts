import { describe, expect, it } from 'vitest';

import {
  BRUSH_OPACITY_MAX,
  BRUSH_OPACITY_MIN,
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  clampBrushOpacity,
  clampBrushSize,
  stepBrushSize,
} from './palette';

describe('palette', () => {
  it('a espessura fica inteira e dentro da faixa', () => {
    expect(clampBrushSize(0)).toBe(BRUSH_SIZE_MIN);
    expect(clampBrushSize(10.6)).toBe(11);
    expect(clampBrushSize(500)).toBe(BRUSH_SIZE_MAX);
  });

  it('[ e ] andam cerca de um quarto da espessura, ao menos 1 px, sem passar dos limites', () => {
    expect(stepBrushSize(2, 1)).toBe(3);
    expect(stepBrushSize(8, 1)).toBe(10);
    expect(stepBrushSize(8, -1)).toBe(6);
    expect(stepBrushSize(40, 1)).toBe(50);
    expect(stepBrushSize(BRUSH_SIZE_MIN, -1)).toBe(BRUSH_SIZE_MIN);
    expect(stepBrushSize(BRUSH_SIZE_MAX, 1)).toBe(BRUSH_SIZE_MAX);
  });

  it('a opacidade fica dentro da faixa', () => {
    expect(clampBrushOpacity(0)).toBe(BRUSH_OPACITY_MIN);
    expect(clampBrushOpacity(0.5)).toBe(0.5);
    expect(clampBrushOpacity(2)).toBe(BRUSH_OPACITY_MAX);
  });
});
