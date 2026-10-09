import { PANEL_HEIGHT, PANEL_MAX_BYTES, PANEL_WIDTH } from '@comicle/shared';

import { DomainError } from '../../platform/errors';

// Server-side check of a panel PNG (protocolo §3): signature, IHDR dimensions and size. The
// pixels are never decoded; the image only has to be what the client claims to send.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** The first chunk starts right after the signature: length (4), type (4), data (13). */
const IHDR_LENGTH_OFFSET = 8;
const IHDR_TYPE_OFFSET = 12;
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const IHDR_DATA_LENGTH = 13;
const IHDR_END = IHDR_WIDTH_OFFSET + IHDR_DATA_LENGTH;
const IHDR_TYPE = 'IHDR';

function invalid(): DomainError {
  return new DomainError('IMAGE_INVALID', 'O desenho enviado não é uma imagem válida.');
}

function hasSignature(png: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => png[index] === byte);
}

function chunkType(png: Uint8Array, offset: number): string {
  return String.fromCharCode(...png.subarray(offset, offset + IHDR_TYPE.length));
}

/** Throws `IMAGE_TOO_LARGE` or `IMAGE_INVALID` unless `png` is a PANEL_WIDTH × PANEL_HEIGHT PNG. */
export function assertValidPanelImage(png: Uint8Array): void {
  if (png.byteLength > PANEL_MAX_BYTES) {
    throw new DomainError('IMAGE_TOO_LARGE', 'O desenho ficou grande demais para enviar.');
  }
  if (png.byteLength < IHDR_END || !hasSignature(png)) {
    throw invalid();
  }
  const data = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (
    data.getUint32(IHDR_LENGTH_OFFSET) !== IHDR_DATA_LENGTH ||
    chunkType(png, IHDR_TYPE_OFFSET) !== IHDR_TYPE ||
    data.getUint32(IHDR_WIDTH_OFFSET) !== PANEL_WIDTH ||
    data.getUint32(IHDR_HEIGHT_OFFSET) !== PANEL_HEIGHT
  ) {
    throw invalid();
  }
}
