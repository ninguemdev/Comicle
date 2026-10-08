import { ROOM_CODE_ALPHABET, roomCodeSchema } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { SeededRng } from '../../platform/random';
import { generateRoomCode, generateUniqueRoomCode, MAX_ROOM_CODE_ATTEMPTS } from './room-code';

describe('código de sala', () => {
  it('R6: 6 caracteres do alfabeto sem 0/O e 1/I/L, válidos para o schema compartilhado', () => {
    const rng = new SeededRng(1);
    for (let draw = 0; draw < 200; draw++) {
      const code = generateRoomCode(rng);

      expect(code).toHaveLength(6);
      expect(code).toMatch(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`));
      expect(roomCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('R6: sorteia de novo quando o código já está em uso', () => {
    const attempts: string[] = [];

    const code = generateUniqueRoomCode(new SeededRng(2), (candidate) => {
      attempts.push(candidate);
      return attempts.length === 1;
    });

    expect(attempts).toHaveLength(2);
    expect(code).toBe(attempts[1]);
    expect(code).not.toBe(attempts[0]);
  });

  it('desiste depois de MAX_ROOM_CODE_ATTEMPTS colisões seguidas', () => {
    let attempts = 0;

    expect(() =>
      generateUniqueRoomCode(new SeededRng(3), () => {
        attempts += 1;
        return true;
      }),
    ).toThrow();
    expect(attempts).toBe(MAX_ROOM_CODE_ATTEMPTS);
  });
});
