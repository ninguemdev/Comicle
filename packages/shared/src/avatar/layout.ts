import { z } from 'zod';

import type { AvatarCategory, AvatarConfig } from '../domain/avatar';

export const EDITABLE_AVATAR_CATEGORIES = [
  'eyes',
  'mouth',
  'cheeks',
  'faceAccessory',
  'hair',
  'hat',
] as const;
export type EditableAvatarCategory = (typeof EDITABLE_AVATAR_CATEGORIES)[number];

export const AVATAR_LAYOUT_LIMITS = {
  minOffset: -0.35,
  maxOffset: 0.35,
  minScale: 0.5,
  maxScale: 2,
} as const;

export const DEFAULT_AVATAR_TRANSFORM = { x: 0, y: 0, scale: 1 } as const;

export const avatarTransformSchema = z.strictObject({
  x: z.number().min(AVATAR_LAYOUT_LIMITS.minOffset).max(AVATAR_LAYOUT_LIMITS.maxOffset),
  y: z.number().min(AVATAR_LAYOUT_LIMITS.minOffset).max(AVATAR_LAYOUT_LIMITS.maxOffset),
  scale: z.number().min(AVATAR_LAYOUT_LIMITS.minScale).max(AVATAR_LAYOUT_LIMITS.maxScale),
});

export const avatarLayoutSchema = z.strictObject({
  version: z.literal(1),
  parts: z.strictObject({
    eyes: avatarTransformSchema.optional(),
    mouth: avatarTransformSchema.optional(),
    cheeks: avatarTransformSchema.optional(),
    faceAccessory: avatarTransformSchema.optional(),
    hair: avatarTransformSchema.optional(),
    hat: avatarTransformSchema.optional(),
  }),
});

export type AvatarTransform = z.infer<typeof avatarTransformSchema>;
export type AvatarLayout = z.infer<typeof avatarLayoutSchema>;

/** Only local stored profiles are repaired; network payloads use the strict schema. */
export function sanitizeAvatarLayout(value: unknown): AvatarLayout | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('version' in value) ||
    value.version !== 1 ||
    !('parts' in value) ||
    typeof value.parts !== 'object' ||
    value.parts === null
  ) {
    return undefined;
  }
  const parts: AvatarLayout['parts'] = {};
  for (const category of EDITABLE_AVATAR_CATEGORIES) {
    const parsed = avatarTransformSchema.safeParse(Reflect.get(value.parts, category));
    if (parsed.success) parts[category] = parsed.data;
  }
  return { version: 1, parts };
}

export function avatarTransform(avatar: AvatarConfig, category: AvatarCategory): AvatarTransform {
  if (category === 'head') return DEFAULT_AVATAR_TRANSFORM;
  const parsed = avatarTransformSchema.safeParse(avatar.layout?.parts[category]);
  return parsed.success ? parsed.data : DEFAULT_AVATAR_TRANSFORM;
}

/** Unit-square geometry; the scale pivots around the visible pixels, not the image canvas. */
export function avatarLayerRect(transform: AvatarTransform, pivot = { x: 0.5, y: 0.5 }) {
  return {
    x: transform.x + pivot.x * (1 - transform.scale),
    y: transform.y + pivot.y * (1 - transform.scale),
    width: transform.scale,
    height: transform.scale,
  };
}
