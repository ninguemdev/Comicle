import { normalizeRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@comicle/shared';

const alphabet = new Set(ROOM_CODE_ALPHABET);

/**
 * R6 while typing: upper case, no spaces, and characters that can never be in a code (0, O, 1,
 * I, L, punctuation…) are dropped instead of rejected, up to `ROOM_CODE_LENGTH`.
 */
export function sanitizeRoomCodeInput(raw: string): string {
  return Array.from(normalizeRoomCode(raw))
    .filter((char) => alphabet.has(char))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
}

export function isCompleteRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH;
}
