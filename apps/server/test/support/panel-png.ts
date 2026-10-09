import { readFileSync } from 'node:fs';

// PNGs for tests, built from the versioned fixture (a solid 1024×768 image).

const FIXTURE = readFileSync(new URL('../fixtures/panel-1024x768.png', import.meta.url));
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;

/** A fresh copy of a valid panel PNG; `marker` changes a trailing byte so copies differ. */
export function panelPng(marker = 0): Uint8Array {
  const png = new Uint8Array(FIXTURE);
  return marker === 0 ? png : new Uint8Array([...png, marker]);
}

/** Valid PNG header with other dimensions. */
export function pngWithSize(width: number, height: number): Uint8Array {
  const png = panelPng();
  const data = new DataView(png.buffer);
  data.setUint32(IHDR_WIDTH_OFFSET, width);
  data.setUint32(IHDR_HEIGHT_OFFSET, height);
  return png;
}
