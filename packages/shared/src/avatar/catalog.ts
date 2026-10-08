import { z } from 'zod';

import {
  AVATAR_CATEGORIES,
  REQUIRED_AVATAR_CATEGORIES,
  type AvatarCategory,
  type AvatarConfig,
  type OptionalAvatarCategory,
  type RequiredAvatarCategory,
} from '../domain/avatar';
import type { Rng } from '../random';
import catalogJson from './catalog.json' with { type: 'json' };

// Catalog format and rules: docs/avatares.md §2.

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requiredCategories: ReadonlySet<AvatarCategory> = new Set(REQUIRED_AVATAR_CATEGORIES);

function isRequiredCategory(category: AvatarCategory): category is RequiredAvatarCategory {
  return requiredCategories.has(category);
}

/** `faceAccessory` → `face-accessory`. */
function categoryIdPrefix(category: AvatarCategory): string {
  return category.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

const optionSchema = z.object({
  id: z.string().regex(KEBAB_CASE),
  label: z.string().min(1),
  /** Relative to apps/web/public/avatars/. */
  file: z.string().min(1),
  /** Hidden from the picker but still rendered for profiles that use it. */
  retired: z.boolean().optional(),
});

const categorySchema = z.object({
  label: z.string().min(1),
  required: z.boolean(),
  options: z.array(optionSchema),
});

export const avatarCatalogSchema = z
  .object({
    version: z.literal(1),
    categories: z.object({
      head: categorySchema,
      cheeks: categorySchema,
      eyes: categorySchema,
      mouth: categorySchema,
      faceAccessory: categorySchema,
      hat: categorySchema,
    }),
  })
  .superRefine((catalog, ctx) => {
    const seenIds = new Set<string>();
    for (const category of AVATAR_CATEGORIES) {
      const { required, options } = catalog.categories[category];
      const path = ['categories', category];
      if (required !== isRequiredCategory(category)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'required'],
          message: `"required" de ${category} não bate com o R2`,
        });
      }
      if (isRequiredCategory(category) && !options.some((option) => !option.retired)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'options'],
          message: `${category} precisa de ao menos uma opção ativa`,
        });
      }
      const prefix = `${categoryIdPrefix(category)}-`;
      for (const option of options) {
        if (!option.id.startsWith(prefix)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'options'],
            message: `o id ${option.id} deve começar com "${prefix}"`,
          });
        }
        if (seenIds.has(option.id)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'options'],
            message: `id duplicado: ${option.id}`,
          });
        }
        seenIds.add(option.id);
      }
    }
  });

export type AvatarCatalog = z.infer<typeof avatarCatalogSchema>;
export type AvatarOption = z.infer<typeof optionSchema>;

export const avatarCatalog: AvatarCatalog = avatarCatalogSchema.parse(catalogJson);

/** Options shown in the picker (non-retired). */
export function activeOptions(category: AvatarCategory): AvatarOption[] {
  return avatarCatalog.categories[category].options.filter((option) => !option.retired);
}

/** Retired IDs stay valid so saved profiles keep rendering. */
export function isValidOptionId(category: AvatarCategory, id: string): boolean {
  return avatarCatalog.categories[category].options.some((option) => option.id === id);
}

function isValidOptional(category: OptionalAvatarCategory, value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && isValidOptionId(category, value));
}

function isValidRequired(category: RequiredAvatarCategory, value: unknown): value is string {
  return typeof value === 'string' && isValidOptionId(category, value);
}

/** R2: every category holds an ID of that category; only optional ones accept `null`. */
export function isValidAvatar(avatar: AvatarConfig): boolean {
  return (
    isValidRequired('head', avatar.head) &&
    isValidRequired('eyes', avatar.eyes) &&
    isValidRequired('mouth', avatar.mouth) &&
    isValidOptional('cheeks', avatar.cheeks) &&
    isValidOptional('hat', avatar.hat) &&
    isValidOptional('faceAccessory', avatar.faceAccessory)
  );
}

function defaultFor(category: RequiredAvatarCategory): string {
  const [first] = activeOptions(category);
  if (!first) {
    // Unreachable: the catalog schema requires an active option in every required category.
    throw new Error(`Catálogo sem opção ativa para ${category}`);
  }
  return first.id;
}

/** First active option of each required category; `null` for optional ones. */
export function defaultAvatar(): AvatarConfig {
  return {
    head: defaultFor('head'),
    eyes: defaultFor('eyes'),
    mouth: defaultFor('mouth'),
    cheeks: null,
    hat: null,
    faceAccessory: null,
  };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[rng.nextInt(items.length)];
  if (item === undefined) {
    throw new RangeError('Rng.nextInt devolveu um índice fora do intervalo');
  }
  return item;
}

function randomRequired(rng: Rng, category: RequiredAvatarCategory): string {
  return pick(rng, activeOptions(category)).id;
}

function randomOptional(rng: Rng, category: OptionalAvatarCategory): string | null {
  return pick<string | null>(rng, [null, ...activeOptions(category).map((option) => option.id)]);
}

/** Random avatar among active options; optional categories may come out as `null`. */
export function randomAvatar(rng: Rng): AvatarConfig {
  return {
    head: randomRequired(rng, 'head'),
    eyes: randomRequired(rng, 'eyes'),
    mouth: randomRequired(rng, 'mouth'),
    cheeks: randomOptional(rng, 'cheeks'),
    hat: randomOptional(rng, 'hat'),
    faceAccessory: randomOptional(rng, 'faceAccessory'),
  };
}

/**
 * R2: replaces only the invalid categories of a saved avatar with their defaults.
 * Accepts anything, since it reads data saved by older versions of the client.
 */
export function sanitizeAvatar(value: unknown): AvatarConfig {
  const saved = new Map<string, unknown>(
    typeof value === 'object' && value !== null ? Object.entries(value) : [],
  );
  const fallback = defaultAvatar();
  const required = (category: RequiredAvatarCategory): string => {
    const candidate = saved.get(category);
    return isValidRequired(category, candidate) ? candidate : fallback[category];
  };
  const optional = (category: OptionalAvatarCategory): string | null => {
    const candidate = saved.get(category);
    return isValidOptional(category, candidate) ? candidate : fallback[category];
  };
  return {
    head: required('head'),
    eyes: required('eyes'),
    mouth: required('mouth'),
    cheeks: optional('cheeks'),
    hat: optional('hat'),
    faceAccessory: optional('faceAccessory'),
  };
}
