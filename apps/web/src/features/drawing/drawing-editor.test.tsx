import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DrawingEditor, type DrawingEditorHandle } from './drawing-editor';

// jsdom has no 2D canvas, ResizeObserver or pointer capture: the editor stays inert on the
// screen, but its document, toolbar and shortcuts work as in a browser.
class NoopResizeObserver {
  observe(): void {
    // nothing to observe in jsdom
  }
  disconnect(): void {
    // nothing to stop
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(disabled = false) {
  const onChange = vi.fn();
  const ref = createRef<DrawingEditorHandle>();
  const view = render(<DrawingEditor disabled={disabled} onChange={onChange} ref={ref} />);
  return { onChange, ref, ...view };
}

function draw(): void {
  const canvas = screen.getByRole('img', { name: 'Área de desenho' });
  const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
  fireEvent.pointerDown(canvas, { ...pointer, clientX: 1, clientY: 1 });
  fireEvent.pointerMove(canvas, { ...pointer, clientX: 5, clientY: 5 });
  fireEvent.pointerUp(canvas, pointer);
}

const pressed = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true';
const enabled = (name: string) => !screen.getByRole('button', { name }).hasAttribute('disabled');
const key = (init: KeyboardEventInit) => {
  fireEvent.keyDown(window, init);
};

describe('DrawingEditor', () => {
  it('B e E escolhem pincel e borracha', () => {
    setup();
    expect(pressed('Pincel (B)')).toBe(true);

    key({ key: 'e' });
    expect(pressed('Borracha (E)')).toBe(true);
    expect(pressed('Pincel (B)')).toBe(false);
    key({ key: 'B' });
    expect(pressed('Pincel (B)')).toBe(true);
  });

  it('[ e ] trocam a espessura, sem passar dos limites', () => {
    setup();
    expect(pressed('Espessura 8')).toBe(true);

    key({ key: ']' });
    expect(pressed('Espessura 16')).toBe(true);
    key({ key: ']' });
    key({ key: ']' });
    expect(pressed('Espessura 32')).toBe(true);
    for (let i = 0; i < 5; i++) {
      key({ key: '[' });
    }
    expect(pressed('Espessura 3')).toBe(true);
  });

  it('Ctrl/⌘+Z desfaz e Ctrl/⌘+Shift+Z refaz, avisando cada mudança', () => {
    const { onChange } = setup();
    expect(enabled('Desfazer (Ctrl+Z)')).toBe(false);

    draw();
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(enabled('Desfazer (Ctrl+Z)')).toBe(true);

    key({ key: 'z', ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(enabled('Desfazer (Ctrl+Z)')).toBe(false);
    expect(enabled('Refazer (Ctrl+Shift+Z)')).toBe(true);

    key({ key: 'Z', metaKey: true, shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(enabled('Refazer (Ctrl+Shift+Z)')).toBe(false);

    // Nothing left to redo: no change, no notice.
    key({ key: 'z', ctrlKey: true, shiftKey: true });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('limpar pede confirmação e pode ser desfeito', () => {
    const { onChange } = setup();
    expect(enabled('Limpar')).toBe(false);
    draw();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    const dialog = screen.getByRole('dialog', { name: 'Limpar o quadro?' });
    // Shortcuts wait while the dialog is open.
    key({ key: 'e' });
    expect(pressed('Borracha (E)')).toBe(false);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(enabled('Limpar')).toBe(false);

    key({ key: 'z', ctrlKey: true });
    expect(enabled('Limpar')).toBe(true);
  });

  it('atalhos não valem digitando num campo nem com o editor desabilitado', () => {
    const { rerender, onChange, ref } = setup();
    const field = document.createElement('input');
    document.body.append(field);

    fireEvent.keyDown(field, { key: 'e' });
    expect(pressed('Borracha (E)')).toBe(false);
    field.remove();

    rerender(<DrawingEditor disabled onChange={onChange} ref={ref} />);
    key({ key: 'e' });
    expect(pressed('Borracha (E)')).toBe(false);
    expect(enabled('Pincel (B)')).toBe(false);
    draw();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('escolher uma cor volta para o pincel', () => {
    setup();
    key({ key: 'e' });

    fireEvent.click(screen.getByRole('button', { name: 'Vermelho' }));
    expect(pressed('Vermelho')).toBe(true);
    expect(pressed('Preto')).toBe(false);
    expect(pressed('Pincel (B)')).toBe(true);
  });

  it('R40: exportPng devolve null sem nada desenhado', async () => {
    const { ref } = setup();

    let png: Uint8Array | null | undefined;
    await act(async () => {
      png = await ref.current?.exportPng();
    });
    expect(png).toBeNull();
  });
});
