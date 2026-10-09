import { PANEL_MAX_BYTES } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { panelPng, pngWithSize } from '../../../test/support/panel-png';
import { DomainError } from '../../platform/errors';
import { assertValidPanelImage } from './panel-image';

function errorCode(png: Uint8Array): string | undefined {
  try {
    assertValidPanelImage(png);
    return undefined;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'outro erro';
  }
}

describe('panel-image', () => {
  it('aceita um PNG 1024×768', () => {
    expect(errorCode(panelPng())).toBeUndefined();
  });

  it('assinatura errada → IMAGE_INVALID', () => {
    const png = panelPng();
    png[1] = 0x00;
    expect(errorCode(png)).toBe('IMAGE_INVALID');
    expect(errorCode(new TextEncoder().encode('não é um png'))).toBe('IMAGE_INVALID');
    expect(errorCode(new Uint8Array())).toBe('IMAGE_INVALID');
  });

  it('primeiro chunk que não é IHDR → IMAGE_INVALID', () => {
    const png = panelPng();
    png[12] = 'X'.charCodeAt(0);
    expect(errorCode(png)).toBe('IMAGE_INVALID');
  });

  it('dimensões erradas → IMAGE_INVALID', () => {
    expect(errorCode(pngWithSize(768, 1024))).toBe('IMAGE_INVALID');
    expect(errorCode(pngWithSize(1024, 767))).toBe('IMAGE_INVALID');
  });

  it('tamanho excedido → IMAGE_TOO_LARGE', () => {
    const png = new Uint8Array(PANEL_MAX_BYTES + 1);
    png.set(panelPng());
    expect(errorCode(png)).toBe('IMAGE_TOO_LARGE');
    const atLimit = new Uint8Array(PANEL_MAX_BYTES);
    atLimit.set(panelPng());
    expect(errorCode(atLimit)).toBeUndefined();
  });

  it('aceita o PNG dentro de um Buffer com deslocamento', () => {
    const backing = new Uint8Array([0, 0, 0, ...panelPng()]);
    expect(errorCode(backing.subarray(3))).toBeUndefined();
  });
});
