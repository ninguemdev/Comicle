// Game rule constants: docs/regras-do-jogo.md §1. Names and values mirror that table.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export const FIXED_PANEL_COUNT_MIN = 2;
export const FIXED_PANEL_COUNT_MAX = 12;
export const FIXED_PANEL_COUNT_DEFAULT = 4;

export const DRAWING_SECONDS_OPTIONS = [30, 45, 60, 90, 120, 180, 240, 300] as const;
export const DRAWING_SECONDS_DEFAULT = 90;

export const THEME_WRITING_SECONDS = 90;
export const THEME_MIN_LENGTH = 3;
export const THEME_MAX_LENGTH = 140;

export const NICKNAME_MAX_LENGTH = 20;
/** Raw length (UTF-16 units) of any text field before normalization; anything longer is refused. */
export const TEXT_INPUT_MAX_LENGTH = 1000;

export const READING_BASE_SECONDS = 15;
export const READING_PER_PANEL_SECONDS = 5;
export const READING_MAX_SECONDS = 60;

export const ROUND_CLOSING_MS = 3000;
export const AUTOSAVE_INTERVAL_MS = 5000;
export const THEME_DRAFT_DEBOUNCE_MS = 1000;

export const PANEL_WIDTH = 1024;
export const PANEL_HEIGHT = 768;
export const PANEL_MAX_BYTES = 2_097_152;

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const HOST_TRANSFER_GRACE_MS = 30_000;
export const LOBBY_DISCONNECT_REMOVE_MS = 120_000;
export const EMPTY_ROOM_TTL_MS = 600_000;
export const ROOM_MAX_AGE_MS = 43_200_000;
export const GUEST_SESSION_TTL_MS = 86_400_000;
