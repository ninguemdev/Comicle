import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, type Rng } from '@comicle/shared';

/**
 * With 31^6 (~887 million) codes, a collision is rare and twenty in a row means something is
 * wrong; failing beats looping forever.
 */
export const MAX_ROOM_CODE_ATTEMPTS = 20;

/** R6: `ROOM_CODE_LENGTH` characters of `ROOM_CODE_ALPHABET`; `rng` is a CSPRNG in production. */
export function generateRoomCode(rng: Rng): string {
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index++) {
    code += ROOM_CODE_ALPHABET.charAt(rng.nextInt(ROOM_CODE_ALPHABET.length));
  }
  return code;
}

/** R6: a code no active room uses; draws again on collision. */
export function generateUniqueRoomCode(rng: Rng, isTaken: (code: string) => boolean): string {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode(rng);
    if (!isTaken(code)) {
      return code;
    }
  }
  throw new Error(`Nenhum código de sala livre em ${String(MAX_ROOM_CODE_ATTEMPTS)} tentativas`);
}
