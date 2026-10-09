import { AVATAR_CATEGORIES, avatarCatalogSchema, avatarCategorySlug } from '@comicle/shared';

import { ART_SIZE, MAX_ART_BYTES, PNG_ART_SIZE } from './layout';
import { readPngInfo } from './png';

// Rules of `pnpm avatars:check` (docs/avatares.md §4, docs/avatares-guia-de-artes.md).

export interface ArtFile {
  /** Relative to apps/web/public/avatars/, with forward slashes. */
  path: string;
  bytes: Uint8Array;
}

export interface CheckReport {
  errors: string[];
  /** Arts in the catalog. */
  total: number;
}

const ART_EXTENSIONS = ['svg', 'png'] as const;

const FORBIDDEN_SVG: readonly (readonly [RegExp, string])[] = [
  [/<script\b/i, 'contém <script>'],
  [/\son[a-z]+\s*=/i, 'contém atributo de evento (on…)'],
  [/<image\b/i, 'contém <image>'],
  [/<foreignObject\b/i, 'contém <foreignObject>'],
  [/<!(?:DOCTYPE|ENTITY)\b/i, 'contém DOCTYPE ou ENTITY'],
  [/@import\b/i, 'importa recurso externo (@import)'],
  [/\bhref\s*=\s*["'](?!#)/i, 'aponta para recurso externo (href)'],
  [/url\((?!\s*["']?#)/i, 'aponta para recurso externo (url())'],
  [/\b(?:https?|ftp):\/\//i, 'contém URL externa'],
];

const COMMENTS = /<!--[\s\S]*?-->/g;
// Namespace declarations look like URLs but never load anything.
const NAMESPACES = /\sxmlns(?::[\w-]+)?\s*=\s*(?:"[^"]*"|'[^']*')/g;
const STANDARD_VIEW_BOX = new RegExp(
  `<svg\\b[^>]*\\bviewBox\\s*=\\s*["']\\s*0[\\s,]+0[\\s,]+${String(ART_SIZE)}[\\s,]+${String(ART_SIZE)}\\s*["']`,
);

/** Generated templates (`_template.*`) and system files are not arts. */
function isIgnored(path: string): boolean {
  const name = path.split('/').at(-1) ?? path;
  return (
    name.startsWith('.') || name === 'Thumbs.db' || (!path.includes('/') && name.startsWith('_'))
  );
}

function svgProblems(bytes: Uint8Array): string[] {
  const text = new TextDecoder().decode(bytes);
  const code = text.replace(COMMENTS, '').replace(NAMESPACES, '');
  const problems = FORBIDDEN_SVG.filter(([pattern]) => pattern.test(code)).map(
    ([, problem]) => problem,
  );
  if (!STANDARD_VIEW_BOX.test(code)) {
    problems.push(`precisa de viewBox="0 0 ${String(ART_SIZE)} ${String(ART_SIZE)}"`);
  }
  return problems;
}

function pngProblems(bytes: Uint8Array): string[] {
  const info = readPngInfo(bytes);
  if (!info) {
    return ['não é um PNG válido'];
  }
  const problems: string[] = [];
  if (info.width !== PNG_ART_SIZE || info.height !== PNG_ART_SIZE) {
    problems.push(
      `tem ${String(info.width)}×${String(info.height)}; o padrão é ${String(PNG_ART_SIZE)}×${String(PNG_ART_SIZE)}`,
    );
  }
  if (!info.transparent) {
    problems.push('precisa de fundo transparente (canal alfa)');
  }
  return problems;
}

function artProblems(file: ArtFile): string[] {
  const problems = file.path.endsWith('.svg') ? svgProblems(file.bytes) : pngProblems(file.bytes);
  if (file.bytes.length > MAX_ART_BYTES) {
    problems.push(
      `tem ${String(Math.ceil(file.bytes.length / 1024))} KB; o limite é ${String(MAX_ART_BYTES / 1024)} KB`,
    );
  }
  return problems;
}

/** Checks the catalog against the files in apps/web/public/avatars/. */
export function checkAvatars(catalogJson: unknown, files: readonly ArtFile[]): CheckReport {
  const parsed = avatarCatalogSchema.safeParse(catalogJson);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map(
        (issue) => `catálogo (${issue.path.join('.')}): ${issue.message}`,
      ),
      total: 0,
    };
  }

  const errors: string[] = [];
  const arts = new Map(
    files.filter((file) => !isIgnored(file.path)).map((file) => [file.path, file]),
  );
  const referenced = new Set<string>();
  let total = 0;

  for (const category of AVATAR_CATEGORIES) {
    const folder = avatarCategorySlug(category);
    for (const option of parsed.data.categories[category].options) {
      total += 1;
      const expected = ART_EXTENSIONS.map((extension) => `${folder}/${option.id}.${extension}`);
      if (!expected.includes(option.file)) {
        errors.push(`${option.id}: "file" deve ser ${expected.join(' ou ')}, não ${option.file}`);
      }
      referenced.add(option.file);
      const art = arts.get(option.file);
      if (!art) {
        errors.push(`${option.file}: arquivo ausente (${option.id} está no catálogo)`);
        continue;
      }
      errors.push(...artProblems(art).map((problem) => `${option.file}: ${problem}`));
    }
  }

  for (const path of arts.keys()) {
    if (!referenced.has(path)) {
      errors.push(`${path}: arquivo órfão (nenhuma opção do catálogo usa este arquivo)`);
    }
  }

  return { errors, total };
}
