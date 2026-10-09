import { describe, expect, it } from 'vitest';

import { smoothPath } from './smoothing';

const p = (x: number, y: number) => ({ x, y });

describe('smoothPath', () => {
  it('sem pontos não desenha nada; um ponto vira um pingo', () => {
    expect(smoothPath([])).toEqual([]);
    expect(smoothPath([p(1, 2)])).toEqual([{ kind: 'dot', at: p(1, 2) }]);
  });

  it('dois pontos viram uma reta', () => {
    expect(smoothPath([p(0, 0), p(10, 0)])).toEqual([
      { kind: 'move', to: p(0, 0) },
      { kind: 'line', to: p(10, 0) },
    ]);
  });

  it('pontos intermediários viram controles de curvas que passam pelos pontos médios', () => {
    expect(smoothPath([p(0, 0), p(10, 0), p(10, 10), p(20, 10)])).toEqual([
      { kind: 'move', to: p(0, 0) },
      { kind: 'quad', control: p(10, 0), to: p(10, 5) },
      { kind: 'quad', control: p(10, 10), to: p(15, 10) },
      { kind: 'line', to: p(20, 10) },
    ]);
  });
});
