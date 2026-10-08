import type { AvatarConfig } from './avatar';

/** R1, R2: what a player sends when creating or joining a room. */
export interface PlayerProfile {
  nickname: string;
  avatar: AvatarConfig;
}
