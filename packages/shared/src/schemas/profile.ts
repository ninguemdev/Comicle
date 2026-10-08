import { z } from 'zod';

import { isValidOptionId } from '../avatar/catalog';
import type { AvatarCategory, AvatarConfig } from '../domain/avatar';
import { nicknameSchema } from './text';

function optionId(category: AvatarCategory) {
  return z
    .string()
    .refine((id) => isValidOptionId(category, id), `Opção de avatar inválida para ${category}.`);
}

/** R2: IDs must exist in the catalog under the right category; optional ones accept `null`. */
export const avatarConfigSchema = z.object({
  head: optionId('head'),
  eyes: optionId('eyes'),
  mouth: optionId('mouth'),
  cheeks: optionId('cheeks').nullable(),
  hat: optionId('hat').nullable(),
  faceAccessory: optionId('faceAccessory').nullable(),
}) satisfies z.ZodType<AvatarConfig>;

/** R1, R2. */
export const playerProfileSchema = z.object({
  nickname: nicknameSchema,
  avatar: avatarConfigSchema,
});
