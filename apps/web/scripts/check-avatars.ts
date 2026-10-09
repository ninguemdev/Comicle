import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ArtFile } from './avatars/check';
import { AVATARS_DIR, CATALOG_FILE } from './avatars/paths';

// `pnpm avatars:check`: validates catalog and arts; exits with 1 on any problem.

async function readArtFiles(): Promise<ArtFile[]> {
  const entries = await readdir(AVATARS_DIR, { recursive: true, withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const absolute = path.join(entry.parentPath, entry.name);
        return {
          path: path.relative(AVATARS_DIR, absolute).split(path.sep).join('/'),
          bytes: await readFile(absolute),
        };
      }),
  );
}

async function loadChecker() {
  try {
    return await import('./avatars/check');
  } catch (error) {
    // @comicle/shared validates the catalog when imported, so a broken catalog fails here.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`avatars:check: catálogo inválido.\n${detail}`);
    process.exit(1);
  }
}

const { checkAvatars } = await loadChecker();
const catalogJson: unknown = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
const report = checkAvatars(catalogJson, await readArtFiles());

if (report.errors.length > 0) {
  console.error(`avatars:check encontrou ${String(report.errors.length)} problema(s):`);
  for (const error of report.errors) {
    console.error(`  - ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`avatars:check ok: ${String(report.total)} artes.`);
}
