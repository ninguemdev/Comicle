import { z } from 'zod';

import {
  NICKNAME_MAX_LENGTH,
  TEXT_INPUT_MAX_LENGTH,
  THEME_MAX_LENGTH,
  THEME_MIN_LENGTH,
} from '../constants';
import { codePointLength, normalizeText } from '../text';

/** Normalizes (R1) and checks the length in code points; a huge raw input is refused first. */
function normalizedText(min: number, max: number, message: string) {
  return z
    .string()
    .max(TEXT_INPUT_MAX_LENGTH, message)
    .transform(normalizeText)
    .refine((text) => {
      const length = codePointLength(text);
      return length >= min && length <= max;
    }, message);
}

/** R1. */
export const nicknameSchema = normalizedText(
  1,
  NICKNAME_MAX_LENGTH,
  `O apelido precisa ter de 1 a ${String(NICKNAME_MAX_LENGTH)} caracteres.`,
);

/** R27. */
export const themeSchema = normalizedText(
  THEME_MIN_LENGTH,
  THEME_MAX_LENGTH,
  `O tema precisa ter de ${String(THEME_MIN_LENGTH)} a ${String(THEME_MAX_LENGTH)} caracteres.`,
);

/** R28: a draft may still be empty or short; R30 decides later whether it is usable. */
export const themeDraftSchema = normalizedText(
  0,
  THEME_MAX_LENGTH,
  `O tema pode ter no máximo ${String(THEME_MAX_LENGTH)} caracteres.`,
);
