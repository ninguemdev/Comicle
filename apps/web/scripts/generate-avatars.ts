import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { findAvatarOption } from '@comicle/shared';

import { AVATARS_DIR } from './avatars/paths';
import { drawPlaceholder, PLACEHOLDER_ARTS, type PlaceholderArt } from './avatars/placeholder-arts';
import { PLACEHOLDER_MARKER } from './avatars/sketch';
import { renderTemplatePng, renderTemplateSvg } from './avatars/template';

// `pnpm avatars:generate`: (re)writes the placeholder arts and the template. A file without the
// placeholder marker is a definitive art and is never overwritten.

type Outcome = 'written' | 'kept' | 'skipped';

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function writeArt(target: string, contents: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function generatePlaceholder(art: PlaceholderArt): Promise<Outcome> {
  const file = findAvatarOption(art.category, art.id)?.file;
  // A PNG in the catalog means the definitive art already replaced the placeholder.
  if (file === undefined || !file.endsWith('.svg')) {
    return 'skipped';
  }
  const target = path.join(AVATARS_DIR, file);
  const current = await readText(target);
  if (current !== null && !current.includes(PLACEHOLDER_MARKER)) {
    return 'kept';
  }
  await writeArt(target, drawPlaceholder(art).toSvg());
  return 'written';
}

const outcomes = await Promise.all(
  PLACEHOLDER_ARTS.map(async (art) => ({
    id: art.id,
    outcome: await generatePlaceholder(art),
  })),
);
await writeArt(path.join(AVATARS_DIR, '_template.svg'), renderTemplateSvg());
await writeArt(path.join(AVATARS_DIR, '_template.png'), renderTemplatePng());

const count = (outcome: Outcome) => outcomes.filter((entry) => entry.outcome === outcome).length;
console.log(
  `avatars:generate: ${String(count('written'))} provisória(s) escrita(s), ${String(count('kept'))} definitiva(s) mantida(s), gabarito atualizado.`,
);
for (const { id, outcome } of outcomes) {
  if (outcome === 'skipped') {
    console.log(`  - ${id}: fora do catálogo ou já em PNG; nada a gerar.`);
  }
}
