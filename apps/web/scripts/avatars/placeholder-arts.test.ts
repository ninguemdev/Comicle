// @vitest-environment node
import { findAvatarOption } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { BRUSH, FACE_AREA, ZONES, type Point } from './layout';
import { drawPlaceholder, PLACEHOLDER_ARTS } from './placeholder-arts';
import { ellipse } from './shapes';

const cases = PLACEHOLDER_ARTS.map((art) => [art.id, art] as const);
const headCases = cases.filter(([, art]) => art.category === 'head');

/** Ray casting. */
function isInside(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if (a && b && a.y > point.y !== b.y > point.y) {
      const crossingX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < crossingX) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function distanceToEdge(point: Point, polygon: readonly Point[]): number {
  return Math.min(
    ...polygon.map((a, index) => {
      const b = polygon[(index + 1) % polygon.length] ?? a;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.min(
        1,
        Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
      );
      return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
    }),
  );
}

describe('artes provisórias', () => {
  it('cada uma tem id único', () => {
    const ids = PLACEHOLDER_ARTS.map((art) => art.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(cases)('%s existe no catálogo, na categoria da arte', (_id, art) => {
    expect(findAvatarOption(art.category, art.id)).toBeDefined();
  });

  it.each(cases)('%s fica dentro da zona da categoria', (_id, art) => {
    const bounds = drawPlaceholder(art).bounds();
    const zone = ZONES[art.category];

    expect(bounds.left, 'esquerda').toBeGreaterThanOrEqual(zone.left);
    expect(bounds.top, 'topo').toBeGreaterThanOrEqual(zone.top);
    expect(bounds.right, 'direita').toBeLessThanOrEqual(zone.right);
    expect(bounds.bottom, 'base').toBeLessThanOrEqual(zone.bottom);
  });

  it.each(headCases)('%s cobre a área do rosto, longe do contorno', (_id, art) => {
    const head = drawPlaceholder(art).marks.find((mark) => mark.kind === 'fill');
    if (!head) {
      throw new Error('cabeça sem preenchimento');
    }
    const face = ellipse(FACE_AREA.center, FACE_AREA.radiusX, FACE_AREA.radiusY);

    for (const point of face) {
      expect(isInside(point, head.points)).toBe(true);
      expect(distanceToEdge(point, head.points)).toBeGreaterThan(BRUSH.thick / 2);
    }
  });

  it('gerar de novo produz exatamente o mesmo arquivo', () => {
    for (const art of PLACEHOLDER_ARTS) {
      expect(drawPlaceholder(art).toSvg()).toBe(drawPlaceholder(art).toSvg());
    }
  });
});
