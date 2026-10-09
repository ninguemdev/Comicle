import { describe, expect, it } from 'vitest';

import { recordingLayer, RecordingContext } from '../../../test/fake-canvas';
import { DrawingDocument, type NewStroke } from './drawing-document';
import { exportPng } from './export';
import { drawStroke, renderDocument, SNAPSHOT_INTERVAL, SnapshotCache } from './renderer';

const BACKGROUND = 'fillRect #FFFFFF 0,0,1024,768';

function stroke(x: number, overrides: Partial<NewStroke> = {}): NewStroke {
  return {
    tool: 'brush',
    color: '#E53935',
    size: 8,
    points: [
      { x, y: 0 },
      { x, y: 10 },
    ],
    ...overrides,
  };
}

function docWith(count: number): DrawingDocument {
  const doc = new DrawingDocument();
  for (let x = 0; x < count; x++) {
    doc.addStroke(stroke(x));
  }
  return doc;
}

/** Strokes painted by a render (the background fill is not a mark). */
function strokesPainted(ctx: RecordingContext): number {
  return ctx.calls.filter((call) => call.startsWith('stroke')).length;
}

describe('renderer', () => {
  it('desenha o traço com pontas redondas, na cor e espessura; a borracha pinta o fundo', () => {
    const ctx = new RecordingContext();
    drawStroke(ctx, stroke(5, { size: 16 }));
    drawStroke(ctx, stroke(6, { tool: 'eraser' }));

    expect(ctx.calls).toEqual([
      'beginPath',
      'moveTo 5,0',
      'lineTo 5,10',
      'stroke #E53935 w16',
      'beginPath',
      'moveTo 6,0',
      'lineTo 6,10',
      'stroke #FFFFFF w8',
    ]);
    expect([ctx.lineCap, ctx.lineJoin]).toEqual(['round', 'round']);
  });

  it('um toque só vira um pingo do tamanho do pincel', () => {
    const ctx = new RecordingContext();
    drawStroke(ctx, stroke(5, { points: [{ x: 5, y: 5 }], size: 32 }));

    expect(ctx.calls).toEqual(['beginPath', 'arc 5,5 r16', 'fill #E53935']);
  });

  it('pinta fundo branco, imagem base por baixo e as operações; limpar repinta o fundo', () => {
    const doc = docWith(1);
    const base = new Image();
    doc.setBaseImage(base);
    doc.clear();
    doc.addStroke(stroke(9));
    const ctx = new RecordingContext();

    renderDocument(ctx, doc);

    expect(ctx.calls[0]).toBe(BACKGROUND);
    expect(ctx.calls[1]).toBe('drawImage');
    expect(ctx.images).toEqual([base]);
    expect(ctx.calls.filter((call) => call === BACKGROUND)).toHaveLength(2);
    expect(strokesPainted(ctx)).toBe(2);
  });

  describe('snapshots', () => {
    function setup(count: number) {
      const layers: ReturnType<typeof recordingLayer>[] = [];
      const cache = new SnapshotCache(() => {
        const layer = recordingLayer();
        layers.push(layer);
        return layer;
      });
      return { doc: docWith(count), cache, layers };
    }

    it(`guarda um snapshot a cada ${String(SNAPSHOT_INTERVAL)} operações e recomeça do mais recente`, () => {
      const { doc, cache, layers } = setup(45);
      renderDocument(new RecordingContext(), doc, cache);
      expect(cache.size).toBe(2);

      const again = new RecordingContext();
      renderDocument(again, doc, cache);
      expect(again.images).toEqual([layers[1]?.ctx.canvas]);
      expect(strokesPainted(again)).toBe(5);
    });

    it('desfazer usa o snapshot anterior; refazer volta a usar o seguinte', () => {
      const { doc, cache, layers } = setup(45);
      renderDocument(new RecordingContext(), doc, cache);

      for (let i = 0; i < 10; i++) {
        doc.undo();
      }
      const undone = new RecordingContext();
      renderDocument(undone, doc, cache);
      expect(undone.images).toEqual([layers[0]?.ctx.canvas]);
      expect(strokesPainted(undone)).toBe(15);

      for (let i = 0; i < 10; i++) {
        doc.redo();
      }
      const redone = new RecordingContext();
      renderDocument(redone, doc, cache);
      expect(redone.images).toEqual([layers[1]?.ctx.canvas]);
      expect(strokesPainted(redone)).toBe(5);
    });

    it('um traço novo depois de desfazer invalida os snapshots seguintes', () => {
      const { doc, cache, layers } = setup(45);
      renderDocument(new RecordingContext(), doc, cache);

      for (let i = 0; i < 10; i++) {
        doc.undo();
      }
      for (let x = 100; x < 110; x++) {
        doc.addStroke(stroke(x));
      }
      const ctx = new RecordingContext();
      renderDocument(ctx, doc, cache);

      // The old snapshot at 40 is gone; a new one is taken at 40 from the new strokes.
      expect(ctx.images).toEqual([layers[0]?.ctx.canvas]);
      expect(strokesPainted(ctx)).toBe(25);
      expect(cache.size).toBe(2);
      expect(layers).toHaveLength(3);
    });

    it('trocar a imagem base invalida todos os snapshots', () => {
      const { doc, cache } = setup(25);
      renderDocument(new RecordingContext(), doc, cache);
      doc.setBaseImage(new Image());

      const ctx = new RecordingContext();
      renderDocument(ctx, doc, cache);
      expect(ctx.calls[0]).toBe(BACKGROUND);
      expect(strokesPainted(ctx)).toBe(25);
    });
  });
});

describe('exportPng', () => {
  it('R40: null sem operações nem imagem base, sem criar canvas', async () => {
    let created = 0;
    const create = () => {
      created++;
      return recordingLayer();
    };

    expect(await exportPng(new DrawingDocument(), create)).toBeNull();
    const cleared = docWith(1);
    cleared.clear();
    expect(await exportPng(cleared, create)).toBeNull();
    expect(created).toBe(0);
  });

  it('pinta o documento inteiro na camada do tamanho do quadro e devolve o PNG', async () => {
    const layer = recordingLayer(new Uint8Array([9, 9]));
    const doc = new DrawingDocument();
    doc.setBaseImage(new Image());

    expect(await exportPng(doc, () => layer)).toEqual(new Uint8Array([9, 9]));
    expect(layer.ctx.calls).toEqual([BACKGROUND, 'drawImage']);
  });
});
