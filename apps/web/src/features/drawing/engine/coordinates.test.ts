import { describe, expect, it } from 'vitest';

import { bufferSize, fitPanel, toLogical } from './coordinates';

describe('coordinates', () => {
  it.each([
    [
      { width: 1024, height: 768 },
      { width: 1024, height: 768 },
    ],
    [
      { width: 360, height: 640 },
      { width: 360, height: 270 },
    ],
    [
      { width: 1440, height: 600 },
      { width: 800, height: 600 },
    ],
    [
      { width: 333, height: 1000 },
      { width: 333, height: 249 },
    ],
    [
      { width: 0, height: 500 },
      { width: 0, height: 0 },
    ],
  ])('fitPanel(%o) mantém 4:3 → %o', (container, expected) => {
    expect(fitPanel(container)).toEqual(expected);
  });

  it.each([
    [{ width: 400, height: 300 }, 1, { width: 400, height: 300 }],
    [{ width: 400, height: 300 }, 2, { width: 800, height: 600 }],
    [{ width: 360, height: 270 }, 2.625, { width: 945, height: 709 }],
    [{ width: 400, height: 300 }, 0, { width: 400, height: 300 }],
    [{ width: 0, height: 0 }, 3, { width: 1, height: 1 }],
  ])('bufferSize(%o, dpr %d) → %o', (css, dpr, expected) => {
    expect(bufferSize(css, dpr)).toEqual(expected);
  });

  it.each([
    // [rect, client point, logical point]
    [{ left: 0, top: 0, width: 1024, height: 768 }, [512, 384], { x: 512, y: 384 }],
    [{ left: 10, top: 20, width: 512, height: 384 }, [10, 20], { x: 0, y: 0 }],
    [{ left: 10, top: 20, width: 512, height: 384 }, [522, 404], { x: 1024, y: 768 }],
    [{ left: 0, top: 100, width: 360, height: 270 }, [90, 167.5], { x: 256, y: 192 }],
    [{ left: 50, top: 50, width: 2048, height: 1536 }, [1074, 818], { x: 512, y: 384 }],
  ])('toLogical em %o: %o → %o, independente do tamanho na tela', (rect, [x, y], expected) => {
    expect(toLogical(x ?? 0, y ?? 0, rect)).toEqual(expected);
  });

  it('toLogical prende o ponto às bordas do quadro', () => {
    const rect = { left: 0, top: 0, width: 400, height: 300 };

    expect(toLogical(-30, 900, rect)).toEqual({ x: 0, y: 768 });
    expect(toLogical(5000, -1, rect)).toEqual({ x: 1024, y: 0 });
    expect(toLogical(10, 10, { ...rect, width: 0 })).toEqual({ x: 0, y: 0 });
  });
});
