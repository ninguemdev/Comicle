import type { AvatarLayout } from '../avatar/layout';

/** Avatar categories in drawing order, bottom to top (docs/avatares.md §1). */
export const AVATAR_CATEGORIES = [
  'head',
  'cheeks',
  'eyes',
  'mouth',
  'faceAccessory',
  'hair',
  'hat',
] as const;

export const REQUIRED_AVATAR_CATEGORIES = ['head', 'eyes', 'mouth'] as const;
export const OPTIONAL_AVATAR_CATEGORIES = ['cheeks', 'faceAccessory', 'hair', 'hat'] as const;

export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number];
export type RequiredAvatarCategory = (typeof REQUIRED_AVATAR_CATEGORIES)[number];
export type OptionalAvatarCategory = (typeof OPTIONAL_AVATAR_CATEGORIES)[number];

/** R2: catalog option IDs; optional categories use `null` for "none". */
export interface AvatarConfig {
  head: string;
  eyes: string;
  mouth: string;
  cheeks: string | null;
  hat: string | null;
  faceAccessory: string | null;
  /** Optional while reading profiles saved before the editor gained hair. */
  hair?: string | null | undefined;
  layout?: AvatarLayout | undefined;
}
