// Persistent content of matches (docs/modelo-de-dados.md §2, Repositórios).

import type { MatchSettings, PanelStatus } from '@comicle/shared';

export type MatchStatus = 'in_progress' | 'presenting' | 'finished' | 'aborted';
export type ThemeSource = 'player' | 'fallback';

export interface NewTheme {
  id: string;
  authorPlayerId: string;
  /** Copy taken when the match starts. */
  authorNickname: string;
  text: string;
  source: ThemeSource;
  seat: number;
}

export interface NewStory {
  id: string;
  themeId: string;
  /** Presentation order. */
  position: number;
}

export interface NewMatch {
  id: string;
  roomId: string;
  settings: MatchSettings;
  totalRounds: number;
  /** Epoch ms. */
  startedAt: number;
  themes: NewTheme[];
  stories: NewStory[];
}

export interface NewPanel {
  id: string;
  storyId: string;
  position: number;
  artistPlayerId: string;
  artistNickname: string;
  status: PanelStatus;
  /** PNG; `null` exactly when the panel is `empty`. */
  png: Uint8Array | null;
}

export interface StoryRepository {
  createRoom(room: { id: string; code: string }): Promise<void>;
  /** Cascades to matches, themes, stories and panels. */
  deleteRoom(roomId: string): Promise<void>;
  /** Inserts the match with its themes and stories. */
  createMatch(match: NewMatch): Promise<void>;
  /** All panels of a round in one transaction: either every panel is saved or none. */
  saveRoundPanels(matchId: string, panels: NewPanel[]): Promise<void>;
  /** `null` for unknown IDs and for `empty` panels. */
  getPanelImage(panelId: string): Promise<{ png: Uint8Array } | null>;
  setMatchStatus(matchId: string, status: MatchStatus): Promise<void>;
  /** R25, R57. */
  deleteMatch(matchId: string): Promise<void>;
  /** R17: on boot, removes every room not yet closed; returns how many. */
  deleteAllOpenRooms(): Promise<number>;
}

/** Invalid write (broken reference, duplicate position, image inconsistent with status…). */
export class StoryRepositoryError extends Error {
  override readonly name = 'StoryRepositoryError';
}

/** Checks done before any write, identical in both implementations. */
export function assertPanelImageMatchesStatus(panel: NewPanel): void {
  if ((panel.status === 'empty') !== (panel.png === null)) {
    throw new StoryRepositoryError(
      `Quadro ${panel.id}: imagem deve ser nula exatamente quando o status é "empty"`,
    );
  }
}

export function assertUniquePositions(panels: readonly NewPanel[]): void {
  const seen = new Set<string>();
  for (const panel of panels) {
    const key = `${panel.storyId}:${String(panel.position)}`;
    if (seen.has(key)) {
      throw new StoryRepositoryError(`Posição ${String(panel.position)} repetida na história`);
    }
    seen.add(key);
  }
}
