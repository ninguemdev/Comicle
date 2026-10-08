import path from 'node:path';

/** apps/web/public/avatars/: where the arts are served from. */
export const AVATARS_DIR = path.resolve(import.meta.dirname, '../../public/avatars');

/** The catalog JSON, read raw so the checker reports every problem it has. */
export const CATALOG_FILE = path.resolve(
  import.meta.dirname,
  '../../../../packages/shared/src/avatar/catalog.json',
);
