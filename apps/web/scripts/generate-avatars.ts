import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AVATARS_DIR } from './avatars/paths';
import { renderTemplatePng, renderTemplateSvg } from './avatars/template';

// `pnpm avatars:generate`: (re)writes the drawing template (`_template.svg` and `.png`). Arts are
// never generated: every option of the catalog has its definitive art (D28).

async function writeArt(target: string, contents: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

await writeArt(path.join(AVATARS_DIR, '_template.svg'), renderTemplateSvg());
await writeArt(path.join(AVATARS_DIR, '_template.png'), renderTemplatePng());
console.log('avatars:generate: gabarito atualizado.');
