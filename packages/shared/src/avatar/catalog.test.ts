import { describe, expect, it } from 'vitest';

import { AVATAR_CATEGORIES, type AvatarConfig } from '../domain/avatar';
import type { Rng } from '../random';
import { avatarConfigSchema } from '../schemas/profile';
import catalogJson from './catalog.json' with { type: 'json' };
import {
  avatarCatalogSchema,
  avatarCategorySlug,
  defaultAvatar,
  findAvatarOption,
  isValidAvatar,
  randomAvatar,
  sanitizeAvatar,
} from './catalog';

const avatar: AvatarConfig = {
  head: 'head-square',
  eyes: 'eyes-wide',
  mouth: 'mouth-open',
  cheeks: 'cheeks-blush',
  hat: 'hat-cap',
  faceAccessory: 'face-accessory-glasses',
};

/** Deterministic Rng that walks through `[0, max)` from `start`. */
function sequenceRng(start: number): Rng {
  let next = start;
  return { nextInt: (maxExclusive) => next++ % maxExclusive };
}

describe('catálogo', () => {
  it('tem as 6 categorias com 4 a 6 opções provisórias cada', () => {
    const { categories } = avatarCatalogSchema.parse(catalogJson);
    for (const category of AVATAR_CATEGORIES) {
      expect(categories[category].options.length, category).toBeGreaterThanOrEqual(4);
      expect(categories[category].options.length, category).toBeLessThanOrEqual(6);
    }
  });

  it('pasta e prefixo de cada categoria seguem o nome em kebab-case', () => {
    expect(AVATAR_CATEGORIES.map(avatarCategorySlug)).toEqual([
      'head',
      'cheeks',
      'eyes',
      'mouth',
      'face-accessory',
      'hat',
    ]);
  });

  it('findAvatarOption encontra só opções da categoria pedida', () => {
    expect(findAvatarOption('hat', 'hat-cap')?.file).toBe('hat/hat-cap.svg');
    expect(findAvatarOption('head', 'hat-cap')).toBeUndefined();
  });

  it('rejeita id duplicado, prefixo errado e "required" divergente do R2', () => {
    const { eyes, mouth, hat } = catalogJson.categories;
    const broken = {
      ...catalogJson,
      categories: {
        ...catalogJson.categories,
        eyes: { ...eyes, options: [...eyes.options, { id: 'eyes-dots', label: 'x', file: 'x' }] },
        mouth: { ...mouth, options: [{ id: 'smile', label: 'x', file: 'x' }] },
        hat: { ...hat, required: true },
      },
    };

    const result = avatarCatalogSchema.safeParse(broken);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(3);
  });
});

describe('avatarConfigSchema', () => {
  it('R2: aceita um avatar completo', () => {
    expect(avatarConfigSchema.parse(avatar)).toEqual(avatar);
  });

  it('R2: ID inexistente é rejeitado', () => {
    expect(avatarConfigSchema.safeParse({ ...avatar, head: 'head-triangle' }).success).toBe(false);
  });

  it('R2: ID de outra categoria é rejeitado', () => {
    expect(avatarConfigSchema.safeParse({ ...avatar, head: 'eyes-dots' }).success).toBe(false);
    expect(avatarConfigSchema.safeParse({ ...avatar, hat: 'cheeks-blush' }).success).toBe(false);
  });

  it('R2: obrigatória null é rejeitada', () => {
    for (const category of ['head', 'eyes', 'mouth'] as const) {
      expect(avatarConfigSchema.safeParse({ ...avatar, [category]: null }).success).toBe(false);
    }
  });

  it('R2: opcionais aceitam null', () => {
    const plain = { ...avatar, cheeks: null, hat: null, faceAccessory: null };
    expect(avatarConfigSchema.parse(plain)).toEqual(plain);
  });
});

describe('helpers do catálogo', () => {
  it('R2: padrão usa a primeira opção das obrigatórias e null nas opcionais', () => {
    expect(defaultAvatar()).toEqual({
      head: 'head-round',
      eyes: 'eyes-dots',
      mouth: 'mouth-smile',
      cheeks: null,
      hat: null,
      faceAccessory: null,
    });
    expect(isValidAvatar(defaultAvatar())).toBe(true);
  });

  it('R2: sanitizeAvatar troca só a categoria inválida', () => {
    const saved = { ...avatar, eyes: 'eyes-retirados', hat: 'head-round' };

    expect(sanitizeAvatar(saved)).toEqual({ ...avatar, eyes: 'eyes-dots', hat: null });
  });

  it('R2: sanitizeAvatar devolve o padrão para valores que não são avatar', () => {
    expect(sanitizeAvatar(null)).toEqual(defaultAvatar());
    expect(sanitizeAvatar('avatar')).toEqual(defaultAvatar());
    expect(sanitizeAvatar({ head: 'head-square' })).toEqual({
      ...defaultAvatar(),
      head: 'head-square',
    });
  });

  it('R2: randomAvatar é determinístico e sempre válido', () => {
    for (let start = 0; start < 20; start++) {
      const generated = randomAvatar(sequenceRng(start));
      expect(isValidAvatar(generated)).toBe(true);
      expect(randomAvatar(sequenceRng(start))).toEqual(generated);
    }
  });

  it('randomAvatar recusa um Rng fora do intervalo', () => {
    expect(() => randomAvatar({ nextInt: (maxExclusive) => maxExclusive })).toThrow(RangeError);
  });
});
