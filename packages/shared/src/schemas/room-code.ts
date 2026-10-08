import { z } from 'zod';

import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../constants';

const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${String(ROOM_CODE_LENGTH)}}$`);

/** R6: user input is upper-cased with every space removed. */
export function normalizeRoomCode(input: string): string {
  return input.replace(/\s/g, '').toUpperCase();
}

/** R6. */
export const roomCodeSchema = z
  .string()
  .transform(normalizeRoomCode)
  .refine((code) => ROOM_CODE_PATTERN.test(code), 'Código de sala inválido.');
