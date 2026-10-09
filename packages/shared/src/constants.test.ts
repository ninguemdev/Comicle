import { describe, expect, it } from 'vitest';

import * as constants from './constants';

describe('constantes', () => {
  it('batem com a tabela de docs/regras-do-jogo.md §1', () => {
    expect({ ...constants }).toEqual({
      MIN_PLAYERS: 2,
      MAX_PLAYERS: 12,
      FIXED_PANEL_COUNT_MIN: 2,
      FIXED_PANEL_COUNT_MAX: 12,
      FIXED_PANEL_COUNT_DEFAULT: 4,
      DRAWING_SECONDS_OPTIONS: [30, 45, 60, 90, 120, 180, 240, 300],
      DRAWING_SECONDS_DEFAULT: 90,
      THEME_WRITING_SECONDS: 90,
      THEME_MIN_LENGTH: 3,
      THEME_MAX_LENGTH: 140,
      NICKNAME_MAX_LENGTH: 20,
      TEXT_INPUT_MAX_LENGTH: 1000,
      READING_BASE_SECONDS: 15,
      READING_PER_PANEL_SECONDS: 5,
      READING_MAX_SECONDS: 60,
      ROUND_CLOSING_MS: 3000,
      AUTOSAVE_INTERVAL_MS: 5000,
      THEME_DRAFT_DEBOUNCE_MS: 1000,
      PANEL_WIDTH: 1024,
      PANEL_HEIGHT: 768,
      PANEL_MAX_BYTES: 2_097_152,
      ROOM_CODE_LENGTH: 6,
      ROOM_CODE_ALPHABET: '23456789ABCDEFGHJKMNPQRSTUVWXYZ',
      HOST_TRANSFER_GRACE_MS: 30_000,
      LOBBY_DISCONNECT_REMOVE_MS: 120_000,
      EMPTY_ROOM_TTL_MS: 600_000,
      ROOM_MAX_AGE_MS: 43_200_000,
      GUEST_SESSION_TTL_MS: 86_400_000,
    });
  });

  it('padrões ficam dentro das faixas permitidas', () => {
    expect(constants.DRAWING_SECONDS_OPTIONS).toContain(constants.DRAWING_SECONDS_DEFAULT);
    expect(constants.FIXED_PANEL_COUNT_DEFAULT).toBeGreaterThanOrEqual(
      constants.FIXED_PANEL_COUNT_MIN,
    );
    expect(constants.FIXED_PANEL_COUNT_DEFAULT).toBeLessThanOrEqual(
      constants.FIXED_PANEL_COUNT_MAX,
    );
  });
});
