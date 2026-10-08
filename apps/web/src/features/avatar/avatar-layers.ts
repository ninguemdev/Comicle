import {
  AVATAR_CATEGORIES,
  findAvatarOption,
  type AvatarCategory,
  type AvatarConfig,
} from '@comicle/shared';

export interface AvatarLayer {
  category: AvatarCategory;
  src: string;
}

/** Public URL of an art; `file` is relative to public/avatars/ (docs/avatares.md §2). */
export function avatarArtUrl(file: string): string {
  return `${import.meta.env.BASE_URL}avatars/${file}`;
}

/** Layers from bottom to top (docs/avatares.md §1); "none" and unknown IDs draw nothing. */
export function avatarLayers(avatar: AvatarConfig): AvatarLayer[] {
  return AVATAR_CATEGORIES.flatMap((category) => {
    const id = avatar[category];
    const option = id === null ? undefined : findAvatarOption(category, id);
    return option ? [{ category, src: avatarArtUrl(option.file) }] : [];
  });
}
