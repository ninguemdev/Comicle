import { crc32, deflateSync } from 'node:zlib';

// Just enough PNG: write an RGBA image (the template) and read the header of an art.

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const BIT_DEPTH = 8;
const COLOR_TYPE_RGBA = 6;
const COLOR_TYPE_GRAY_ALPHA = 4;
/** Chunk length + type before the data, CRC after it. */
const CHUNK_HEADER = 8;
const CHUNK_CRC = 4;
const FILTER_NONE = 0;

export interface PngInfo {
  width: number;
  height: number;
  /** Alpha channel, or a palette with a transparency chunk (tRNS). */
  transparent: boolean;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const result = new Uint8Array(CHUNK_HEADER + data.length + CHUNK_CRC);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.length);
  result.set(typeBytes, 4);
  result.set(data, CHUNK_HEADER);
  view.setUint32(CHUNK_HEADER + data.length, crc32(result.subarray(4, CHUNK_HEADER + data.length)));
  return result;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/** `rgba` holds `width × height` pixels, 4 bytes each, row by row (straight alpha). */
export function encodeRgbaPng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([BIT_DEPTH, COLOR_TYPE_RGBA, 0, 0, 0], 8);

  const rowLength = width * 4;
  const scanlines = new Uint8Array((rowLength + 1) * height);
  for (let row = 0; row < height; row++) {
    scanlines[row * (rowLength + 1)] = FILTER_NONE;
    scanlines.set(rgba.subarray(row * rowLength, (row + 1) * rowLength), row * (rowLength + 1) + 1);
  }

  return concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** Size and transparency from the chunk headers; `null` when the bytes are not a PNG. */
export function readPngInfo(bytes: Uint8Array): PngInfo | null {
  if (bytes.length < SIGNATURE.length || SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let header: { width: number; height: number; colorType: number } | null = null;
  let hasTransparencyChunk = false;
  let offset = SIGNATURE.length;
  while (offset + CHUNK_HEADER <= bytes.length) {
    const length = view.getUint32(offset);
    const type = decoder.decode(bytes.subarray(offset + 4, offset + CHUNK_HEADER));
    const data = offset + CHUNK_HEADER;
    if (type === 'IHDR' && data + 10 <= bytes.length) {
      header = {
        width: view.getUint32(data),
        height: view.getUint32(data + 4),
        colorType: view.getUint8(data + 9),
      };
    } else if (type === 'tRNS') {
      hasTransparencyChunk = true;
    } else if (type === 'IDAT' || type === 'IEND') {
      // tRNS always comes before the image data.
      break;
    }
    offset = data + length + CHUNK_CRC;
  }
  if (!header) {
    return null;
  }
  const alpha = header.colorType === COLOR_TYPE_RGBA || header.colorType === COLOR_TYPE_GRAY_ALPHA;
  return {
    width: header.width,
    height: header.height,
    transparent: alpha || hasTransparencyChunk,
  };
}
