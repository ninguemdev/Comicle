// @vitest-environment node
import { findAvatarOption } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import catalogJson from '../../../../packages/shared/src/avatar/catalog.json' with { type: 'json' };
import { checkAvatars, type ArtFile } from './check';
import { drawPlaceholder, PLACEHOLDER_ARTS } from './placeholder-arts';
import { encodeRgbaPng } from './png';

const encoder = new TextEncoder();
const VALID_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0"/></svg>';

function svg(text: string): Uint8Array {
  return encoder.encode(text);
}

/** Every placeholder, as `pnpm avatars:generate` writes it. */
function generatedFiles(): ArtFile[] {
  return PLACEHOLDER_ARTS.map((art) => ({
    path: findAvatarOption(art.category, art.id)?.file ?? art.id,
    bytes: svg(drawPlaceholder(art).toSvg()),
  }));
}

function replacing(path: string, bytes: Uint8Array): ArtFile[] {
  return generatedFiles().map((file) => (file.path === path ? { path, bytes } : file));
}

/** Catalog where one hat points to a PNG instead of the SVG. */
function catalogWithPngHat() {
  const { hat } = catalogJson.categories;
  const options = hat.options.map((option) =>
    option.id === 'hat-cap' ? { ...option, file: 'hat/hat-cap.png' } : option,
  );
  return { ...catalogJson, categories: { ...catalogJson.categories, hat: { ...hat, options } } };
}

function pngFiles(png: Uint8Array): ArtFile[] {
  return [
    ...generatedFiles().filter((file) => file.path !== 'hat/hat-cap.svg'),
    { path: 'hat/hat-cap.png', bytes: png },
  ];
}

describe('avatars:check', () => {
  it('aceita o catálogo com as artes provisórias geradas e conta as provisórias', () => {
    const report = checkAvatars(catalogJson, generatedFiles());

    expect(report.errors).toEqual([]);
    expect(report.total).toBe(PLACEHOLDER_ARTS.length);
    expect(report.placeholders).toHaveLength(PLACEHOLDER_ARTS.length);
  });

  it('arte definitiva (sem o marcador) não conta como provisória', () => {
    const report = checkAvatars(catalogJson, replacing('hat/hat-cap.svg', svg(VALID_SVG)));

    expect(report.errors).toEqual([]);
    expect(report.placeholders).not.toContain('hat/hat-cap.svg');
  });

  it('detecta arquivo ausente', () => {
    const files = generatedFiles().filter((file) => file.path !== 'eyes/eyes-wide.svg');

    expect(checkAvatars(catalogJson, files).errors).toEqual([
      'eyes/eyes-wide.svg: arquivo ausente (eyes-wide está no catálogo)',
    ]);
  });

  it('detecta arquivo órfão e ignora o gabarito', () => {
    const files = [
      ...generatedFiles(),
      { path: 'hat/hat-cowboy.svg', bytes: svg(VALID_SVG) },
      { path: '_template.svg', bytes: svg(VALID_SVG) },
      { path: '_template.png', bytes: encodeRgbaPng(1, 1, new Uint8Array(4)) },
    ];

    expect(checkAvatars(catalogJson, files).errors).toEqual([
      'hat/hat-cowboy.svg: arquivo órfão (nenhuma opção do catálogo usa este arquivo)',
    ]);
  });

  it('detecta ID duplicado no catálogo', () => {
    const { eyes } = catalogJson.categories;
    const duplicated = {
      ...catalogJson,
      categories: {
        ...catalogJson.categories,
        eyes: { ...eyes, options: [...eyes.options, eyes.options[0]] },
      },
    };

    expect(checkAvatars(duplicated, generatedFiles()).errors).toEqual([
      'catálogo (categories.eyes.options): id duplicado: eyes-dots',
    ]);
  });

  it('detecta "file" fora do padrão <pasta>/<id>.svg', () => {
    const { mouth } = catalogJson.categories;
    const options = mouth.options.map((option) =>
      option.id === 'mouth-flat' ? { ...option, file: 'mouth/seria.svg' } : option,
    );
    const renamed = {
      ...catalogJson,
      categories: { ...catalogJson.categories, mouth: { ...mouth, options } },
    };
    const files = generatedFiles().map((file) =>
      file.path === 'mouth/mouth-flat.svg' ? { ...file, path: 'mouth/seria.svg' } : file,
    );

    expect(checkAvatars(renamed, files).errors).toEqual([
      'mouth-flat: "file" deve ser mouth/mouth-flat.svg ou mouth/mouth-flat.png, não mouth/seria.svg',
    ]);
  });

  it.each([
    ['<script>', '<svg viewBox="0 0 512 512"><script>alert(1)</script></svg>', 'contém <script>'],
    [
      'on*',
      '<svg viewBox="0 0 512 512" onload="alert(1)"></svg>',
      'contém atributo de evento (on…)',
    ],
    ['<image>', '<svg viewBox="0 0 512 512"><image href="#a"/></svg>', 'contém <image>'],
    [
      'URL externa',
      '<svg viewBox="0 0 512 512"><use href="https://example.com/a.svg#x"/></svg>',
      'aponta para recurso externo (href)',
    ],
    [
      'url() externa',
      '<svg viewBox="0 0 512 512"><path fill="url(arte.svg#g)"/></svg>',
      'aponta para recurso externo (url())',
    ],
    [
      'viewBox fora do padrão',
      '<svg viewBox="0 0 100 100"></svg>',
      'precisa de viewBox="0 0 512 512"',
    ],
  ])('recusa SVG com %s', (_case, content, problem) => {
    const errors = checkAvatars(catalogJson, replacing('head/head-round.svg', svg(content))).errors;

    expect(errors).toContain(`head/head-round.svg: ${problem}`);
  });

  it('aceita referências internas (#id) e o namespace do SVG', () => {
    const content =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">' +
      '<defs><linearGradient id="head-round-g"/></defs><path fill="url(#head-round-g)"/><use xlink:href="#head-round-g"/></svg>';

    expect(
      checkAvatars(catalogJson, replacing('head/head-round.svg', svg(content))).errors,
    ).toEqual([]);
  });

  it('recusa arte acima do limite de tamanho', () => {
    const padding = `<!-- ${'x'.repeat(110 * 1024)} -->`;
    const errors = checkAvatars(
      catalogJson,
      replacing('head/head-round.svg', svg(VALID_SVG.replace('</svg>', `${padding}</svg>`))),
    ).errors;

    expect(errors).toEqual(['head/head-round.svg: tem 111 KB; o limite é 100 KB']);
  });

  it('aceita PNG 1024×1024 com transparência', () => {
    const png = encodeRgbaPng(1024, 1024, new Uint8Array(1024 * 1024 * 4));

    expect(checkAvatars(catalogWithPngHat(), pngFiles(png)).errors).toEqual([]);
  });

  it('recusa PNG fora do padrão e arquivo que não é PNG', () => {
    const small = encodeRgbaPng(512, 512, new Uint8Array(512 * 512 * 4));

    expect(checkAvatars(catalogWithPngHat(), pngFiles(small)).errors).toEqual([
      'hat/hat-cap.png: tem 512×512; o padrão é 1024×1024',
    ]);
    expect(checkAvatars(catalogWithPngHat(), pngFiles(svg(VALID_SVG))).errors).toEqual([
      'hat/hat-cap.png: não é um PNG válido',
    ]);
  });
});
