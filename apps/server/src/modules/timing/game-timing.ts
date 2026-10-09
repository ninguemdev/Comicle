import {
  EMPTY_ROOM_TTL_MS,
  HOST_TRANSFER_GRACE_MS,
  LOBBY_DISCONNECT_REMOVE_MS,
  READING_BASE_SECONDS,
  READING_MAX_SECONDS,
  READING_PER_PANEL_SECONDS,
  ROOM_MAX_AGE_MS,
  ROUND_CLOSING_MS,
  THEME_WRITING_SECONDS,
  type MatchSettings,
} from '@comicle/shared';

import type { AppConfig } from '../../config/env';

const MS_PER_SECOND = 1000;

/** Every duration of rooms and matches (arquitetura §4, Tempo), injected so tests and E2E can shorten them. */
export interface GameTimingConfig {
  themeWritingMs: number;
  readingMs(roundIndex: number): number;
  drawingMs(settings: MatchSettings): number;
  roundClosingMs: number;
  hostTransferGraceMs: number;
  lobbyDisconnectRemoveMs: number;
  emptyRoomTtlMs: number;
  roomMaxAgeMs: number;
}

/** R35: reading time grows with the panels already drawn (`roundIndex`), up to a cap. */
export function readingSeconds(roundIndex: number): number {
  return Math.min(
    READING_BASE_SECONDS + READING_PER_PANEL_SECONDS * roundIndex,
    READING_MAX_SECONDS,
  );
}

const roomTiming = {
  hostTransferGraceMs: HOST_TRANSFER_GRACE_MS,
  lobbyDisconnectRemoveMs: LOBBY_DISCONNECT_REMOVE_MS,
  emptyRoomTtlMs: EMPTY_ROOM_TTL_MS,
  roomMaxAgeMs: ROOM_MAX_AGE_MS,
};

/** The rules' constants (regras-do-jogo §1). */
export const defaultGameTiming: GameTimingConfig = {
  themeWritingMs: THEME_WRITING_SECONDS * MS_PER_SECOND,
  readingMs: (roundIndex) => readingSeconds(roundIndex) * MS_PER_SECOND,
  drawingMs: (settings) => settings.drawingSeconds * MS_PER_SECOND,
  roundClosingMs: ROUND_CLOSING_MS,
  ...roomTiming,
};

// Short match phases for E2E and manual testing; refused in production (config/env.ts).
const FAST_THEME_WRITING_MS = 20_000;
const FAST_READING_MS = 5000;
const FAST_DRAWING_MS = 20_000;
const FAST_ROUND_CLOSING_MS = 1000;

export const fastGameTiming: GameTimingConfig = {
  themeWritingMs: FAST_THEME_WRITING_MS,
  readingMs: () => FAST_READING_MS,
  drawingMs: () => FAST_DRAWING_MS,
  roundClosingMs: FAST_ROUND_CLOSING_MS,
  ...roomTiming,
};

export function gameTimingFor(profile: AppConfig['GAME_TIMING_PROFILE']): GameTimingConfig {
  switch (profile) {
    case 'default':
      return defaultGameTiming;
    case 'fast':
      return fastGameTiming;
    default:
      return profile satisfies never;
  }
}
