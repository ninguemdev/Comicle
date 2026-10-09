// @vitest-environment node
import { describe, expect, it } from 'vitest';

import catalogJson from '../../../../packages/shared/src/avatar/catalog.json' with { type: 'json' };
import { checkAvatars, type ArtFile } from './check';
import { encodeRgbaPng } from './png';

const encoder = new TextEncoder();
const VALID_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0"/></svg>';

function svg(text: string): Uint8Array {
  return encoder.encode(text);
}

/** A blank, transparent art in the standard size, shared by every option. */
const VALID_PNG = encodeRgbaPng(1024, 1024, new Uint8Array(1024 * 1024 * 4));

const allOptions = Object.values(catalogJson.categories).flatMap((category) => category.options);

/** One valid file per option of the real catalog. */
function catalogFiles(): ArtFile[] {
  return allOptions.map((option) => ({ path: option.file, bytes: VALID_PNG }));
}

function replacing(path: string, bytes: Uint8Array): ArtFile[] {
  return catalogFiles().map((file) => (file.path === path ? { path, bytes } : file));
}

/** Catalog where the round head is an SVG, to try the SVG rules. */
function catalogWithSvgHead() {
  const { head } = catalogJson.categories;
  const options = head.options.map((option) =>
    option.id === 'head-round' ? { ...option, file: 'head/head-round.svg' } : option,
  );
  return { ...catalogJson, categories: { ...catalogJson.categories, head: { ...head, options } } };
}

function svgHeadFiles(content: Uint8Array): ArtFile[] {
  return [
    ...catalogFiles().filter((file) => file.path !== 'head/head-round.png'),
    { path: 'head/head-round.svg', bytes: content },
  ];
}

describe('avatars:check', () => {
  it('aceita o catálogo com uma arte válida por opção e conta as artes', () => {
    const report = checkAvatars(catalogJson, catalogFiles());

    expect(report.errors).toEqual([]);
    expect(report.total).toBe(allOptions.length);
  });

  it('aceita arte em SVG com o viewBox padrão', () => {
    expect(checkAvatars(catalogWithSvgHead(), svgHeadFiles(svg(VALID_SVG))).errors).toEqual([]);
  });

  it('detecta arquivo ausente', () => {
    const files = catalogFiles().filter((file) => file.path !== 'eyes/eyes-wide.png');

    expect(checkAvatars(catalogJson, files).errors).toEqual([
      'eyes/eyes-wide.png: arquivo ausente (eyes-wide está no catálogo)',
    ]);
  });

  it('detecta arquivo órfão e ignora o gabarito', () => {
    const files = [
      ...catalogFiles(),
      { path: 'hat/hat-sombrero.png', bytes: VALID_PNG },
      { path: '_template.svg', bytes: svg(VALID_SVG) },
      { path: '_template.png', bytes: encodeRgbaPng(1, 1, new Uint8Array(4)) },
    ];

    expect(checkAvatars(catalogJson, files).errors).toEqual([
      'hat/hat-sombrero.png: arquivo órfão (nenhuma opção do catálogo usa este arquivo)',
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

    expect(checkAvatars(duplicated, catalogFiles()).errors).toEqual([
      'catálogo (categories.eyes.options): id duplicado: eyes-dots',
    ]);
  });

  it('detecta "file" fora do padrão <pasta>/<id>.png', () => {
    const { mouth } = catalogJson.categories;
    const options = mouth.options.map((option) =>
      option.id === 'mouth-sad' ? { ...option, file: 'mouth/triste.png' } : option,
    );
    const renamed = {
      ...catalogJson,
      categories: { ...catalogJson.categories, mouth: { ...mouth, options } },
    };
    const files = catalogFiles().map((file) =>
      file.path === 'mouth/mouth-sad.png' ? { ...file, path: 'mouth/triste.png' } : file,
    );

    expect(checkAvatars(renamed, files).errors).toEqual([
      'mouth-sad: "file" deve ser mouth/mouth-sad.svg ou mouth/mouth-sad.png, não mouth/triste.png',
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
    const errors = checkAvatars(catalogWithSvgHead(), svgHeadFiles(svg(content))).errors;

    expect(errors).toContain(`head/head-round.svg: ${problem}`);
  });

  it('aceita referências internas (#id) e o namespace do SVG', () => {
    const content =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">' +
      '<defs><linearGradient id="head-round-g"/></defs><path fill="url(#head-round-g)"/><use xlink:href="#head-round-g"/></svg>';

    expect(checkAvatars(catalogWithSvgHead(), svgHeadFiles(svg(content))).errors).toEqual([]);
  });

  it('recusa arte acima do limite de tamanho', () => {
    const padding = `<!-- ${'x'.repeat(110 * 1024)} -->`;
    const errors = checkAvatars(
      catalogWithSvgHead(),
      svgHeadFiles(svg(VALID_SVG.replace('</svg>', `${padding}</svg>`))),
    ).errors;

    expect(errors).toEqual(['head/head-round.svg: tem 111 KB; o limite é 100 KB']);
  });

  it('recusa PNG fora do padrão e arquivo que não é PNG', () => {
    const small = encodeRgbaPng(512, 512, new Uint8Array(512 * 512 * 4));

    expect(checkAvatars(catalogJson, replacing('hat/hat-cap.png', small)).errors).toEqual([
      'hat/hat-cap.png: tem 512×512; o padrão é 1024×1024',
    ]);
    expect(checkAvatars(catalogJson, replacing('hat/hat-cap.png', svg(VALID_SVG))).errors).toEqual([
      'hat/hat-cap.png: não é um PNG válido',
    ]);
  });
});
