import { describe, expect, it } from 'vitest';

import { DrawingDocument, UNDO_LIMIT, type NewStroke } from './drawing-document';

function stroke(x: number, tool: NewStroke['tool'] = 'brush'): NewStroke {
  return { tool, color: '#000000', size: 8, points: [{ x, y: x }] };
}

/** Runs `step` until it returns false; how many times it succeeded. */
function repeat(step: () => boolean): number {
  let count = 0;
  while (step()) {
    count++;
  }
  return count;
}

function strokeXs(doc: DrawingDocument): number[] {
  return doc.operations.flatMap((op) => (op.kind === 'stroke' ? [op.points[0]?.x ?? -1] : []));
}

describe('DrawingDocument', () => {
  it('desfaz e refaz traços na ordem', () => {
    const doc = new DrawingDocument();
    doc.addStroke(stroke(1));
    doc.addStroke(stroke(2));

    expect(doc.undo()).toBe(true);
    expect(strokeXs(doc)).toEqual([1]);
    expect(doc.canRedo).toBe(true);
    expect(doc.redo()).toBe(true);
    expect(strokeXs(doc)).toEqual([1, 2]);
    expect(doc.redo()).toBe(false);
  });

  it('um novo traço limpa a pilha de refazer', () => {
    const doc = new DrawingDocument();
    doc.addStroke(stroke(1));
    doc.addStroke(stroke(2));
    doc.undo();
    doc.addStroke(stroke(3));

    expect(doc.canRedo).toBe(false);
    expect(doc.redo()).toBe(false);
    expect(strokeXs(doc)).toEqual([1, 3]);
  });

  it(`desfaz no máximo ${String(UNDO_LIMIT)} passos, sem perder os traços antigos`, () => {
    const doc = new DrawingDocument();
    for (let x = 0; x < UNDO_LIMIT + 20; x++) {
      doc.addStroke(stroke(x));
    }

    expect(repeat(() => doc.undo())).toBe(UNDO_LIMIT);
    expect(doc.canUndo).toBe(false);
    expect(doc.operations).toHaveLength(20);

    // Redoing everything and drawing again keeps the limit counted from the newest step.
    expect(repeat(() => doc.redo())).toBe(UNDO_LIMIT);
    doc.addStroke(stroke(999));
    expect(repeat(() => doc.undo())).toBe(UNDO_LIMIT);
  });

  it('limpar entra no histórico e pode ser desfeito', () => {
    const doc = new DrawingDocument();
    doc.addStroke(stroke(1));

    expect(doc.clear()).toBe(true);
    expect(doc.isEmpty).toBe(true);
    expect(doc.operations.at(-1)).toEqual({ kind: 'clear' });
    doc.undo();
    expect(doc.isEmpty).toBe(false);
    expect(strokeXs(doc)).toEqual([1]);
  });

  it('limpar um desenho vazio não cria passo', () => {
    const doc = new DrawingDocument();

    expect(doc.clear()).toBe(false);
    expect(doc.canUndo).toBe(false);
    expect(doc.revision).toBe(0);
  });

  it('R40: isEmpty sem operações nem imagem base; borracha sozinha não conta como desenho', () => {
    const doc = new DrawingDocument();
    expect(doc.isEmpty).toBe(true);

    doc.addStroke(stroke(1, 'eraser'));
    expect(doc.isEmpty).toBe(true);
    doc.addStroke(stroke(2));
    expect(doc.isEmpty).toBe(false);
    doc.addStroke({ ...stroke(3), points: [] });
    expect(doc.operations).toHaveLength(2);
  });

  it('R48: a imagem base conta como conteúdo, não entra no histórico e some com limpar', () => {
    const doc = new DrawingDocument();
    const base = new Image();
    doc.setBaseImage(base);

    expect(doc.baseImage).toBe(base);
    expect(doc.isEmpty).toBe(false);
    expect(doc.canUndo).toBe(false);
    expect(doc.undo()).toBe(false);
    expect(doc.baseImage).toBe(base);

    doc.clear();
    expect(doc.isEmpty).toBe(true);
    doc.undo();
    expect(doc.isEmpty).toBe(false);
  });

  it('revision cresce a cada mudança', () => {
    const doc = new DrawingDocument();
    const seen = [doc.revision];
    doc.addStroke(stroke(1));
    seen.push(doc.revision);
    doc.undo();
    seen.push(doc.revision);
    doc.redo();
    seen.push(doc.revision);
    doc.clear();
    seen.push(doc.revision);
    doc.setBaseImage(null);
    seen.push(doc.revision);

    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
