// @vitest-environment node
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { encodeRgbaPng, readPngInfo } from './png';
import { renderTemplatePng, renderTemplateSvg } from './template';

/** Minimal PNG header by hand: IHDR (and optionally tRNS); readPngInfo ignores the CRCs. */
function handmadePng(colorType: number, withTransparency: boolean): Uint8Array {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdr = [0, 0, 0, 13, ...'IHDR'.split('').map((c) => c.charCodeAt(0))];
  const size = [0, 0, 4, 0, 0, 0, 4, 0];
  const header = [...ihdr, ...size, 8, colorType, 0, 0, 0, 0, 0, 0, 0];
  const trns = [0, 0, 0, 1, ...'tRNS'.split('').map((c) => c.charCodeAt(0)), 0, 0, 0, 0, 0];
  const iend = [0, 0, 0, 0, ...'IEND'.split('').map((c) => c.charCodeAt(0)), 0, 0, 0, 0];
  return Uint8Array.from([...signature, ...header, ...(withTransparency ? trns : []), ...iend]);
}

describe('png', () => {
  it('lê largura, altura e transparência do PNG que gera', () => {
    const pixels = Uint8Array.from([255, 0, 0, 255, 0, 0, 255, 128]);
    const png = encodeRgbaPng(2, 1, pixels);

    expect(readPngInfo(png)).toEqual({ width: 2, height: 1, transparent: true });
  });

  it('grava os pixels sem perdas', () => {
    const pixels = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const png = encodeRgbaPng(2, 1, pixels);
    // Signature (8) + IHDR chunk (25) + IDAT length/type (8) up to the compressed data.
    const idatLength = new DataView(png.buffer).getUint32(33);
    const scanline = inflateSync(png.subarray(41, 41 + idatLength));

    expect([...scanline]).toEqual([0, ...pixels]);
  });

  it('paleta só é transparente com tRNS', () => {
    expect(readPngInfo(handmadePng(3, false))?.transparent).toBe(false);
    expect(readPngInfo(handmadePng(3, true))?.transparent).toBe(true);
    expect(readPngInfo(handmadePng(2, false))).toEqual({
      width: 1024,
      height: 1024,
      transparent: false,
    });
  });

  it('devolve null para o que não é PNG', () => {
    expect(readPngInfo(new TextEncoder().encode('<svg/>'))).toBeNull();
  });
});

describe('gabarito', () => {
  it('o PNG tem 1024×1024 com transparência', () => {
    expect(readPngInfo(renderTemplatePng())).toEqual({
      width: 1024,
      height: 1024,
      transparent: true,
    });
  });

  it('o SVG usa o viewBox padrão e mostra as zonas', () => {
    const svg = renderTemplateSvg();

    expect(svg).toContain('viewBox="0 0 512 512"');
    for (const label of ['chapéu', 'cabeça', 'olhos', 'boca', 'bochechas', 'acessório']) {
      expect(svg).toContain(`>${label}</text>`);
    }
  });
});
