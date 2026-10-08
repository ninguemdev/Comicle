import type { AvatarConfig } from '@comicle/shared';

import { avatarLayers } from './avatar-layers';

/** Sizes of docs/avatares.md §6: lists, cards, lobby/presentation and editor. */
export const AVATAR_SIZES = [32, 64, 160, 256] as const;
export type AvatarSize = (typeof AVATAR_SIZES)[number];

const SIZE_CLASSES: Record<AvatarSize, string> = {
  32: 'size-8',
  64: 'size-16',
  160: 'size-40',
  256: 'size-64',
};

export interface AvatarRendererProps {
  avatar: AvatarConfig;
  size: AvatarSize;
  /** Accessible name; without one the avatar is decorative (e.g. a thumbnail inside a labeled button). */
  label?: string;
}

/** Stacks the art layers in a square; every art shares the same 512×512 frame. */
export function AvatarRenderer({ avatar, size, label }: AvatarRendererProps) {
  const accessibility =
    label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  return (
    <span className={`relative inline-block shrink-0 ${SIZE_CLASSES[size]}`} {...accessibility}>
      {avatarLayers(avatar).map((layer) => (
        <img
          key={layer.category}
          src={layer.src}
          alt=""
          width={size}
          height={size}
          draggable={false}
          className="absolute inset-0 size-full select-none"
        />
      ))}
    </span>
  );
}
