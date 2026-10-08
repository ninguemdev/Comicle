// Per-player projection of the room state (docs/protocolo-realtime.md §5).

import type { AvatarConfig } from './avatar';
import type { MatchSettings } from './match-settings';

export type RoomStatus = 'lobby' | 'in_match';

/** `member` outside a match; `participant` / `spectator` during a match. */
export type MemberRole = 'member' | 'participant' | 'spectator';

export type MemberProgress = 'idle' | 'working' | 'done';

export interface MemberView {
  playerId: string;
  nickname: string;
  avatar: AvatarConfig;
  connected: boolean;
  isHost: boolean;
  role: MemberRole;
  /** Public progress in the current phase. */
  progress: MemberProgress;
}

export type MatchPhase =
  'theme_writing' | 'round_reading' | 'round_drawing' | 'round_closing' | 'presentation';

export interface ArtistRef {
  playerId: string;
  nickname: string;
  avatar: AvatarConfig;
}

export type PanelStatus = 'complete' | 'partial' | 'empty';

export interface PanelRef {
  panelId: string;
  position: number;
  artist: ArtistRef;
  status: PanelStatus;
}

export type PlayerTask =
  | { kind: 'write_theme'; status: 'writing' | 'submitted'; draft: string }
  | { kind: 'read_story'; status: 'reading'; theme: string; previousPanels: PanelRef[] }
  | { kind: 'read_story'; status: 'ready'; theme: string }
  | {
      kind: 'draw_panel';
      status: 'drawing' | 'submitted';
      theme: string;
      panelPosition: number;
      hasDraft: boolean;
    }
  /** round_closing, or nothing to do. */
  | { kind: 'wait' }
  /** Spectators while the stories are being created. */
  | { kind: 'spectate' }
  /** Everyone during the presentation. */
  | { kind: 'watch' };

export type PresentationStep =
  { kind: 'theme' } | { kind: 'panel'; position: number } | { kind: 'full' };

export interface PresentationView {
  status: 'showing' | 'finished';
  storyIndex: number;
  storyCount: number;
  step: PresentationStep;
  maxStoryReached: number;
  story: {
    theme: { text: string; author: ArtistRef };
    panelCount: number;
    /** Only the revealed panels (R53, R54). */
    revealedPanels: PanelRef[];
  };
  reachedStories: { index: number; themeText: string; author: ArtistRef }[];
}

export interface MatchView {
  matchId: string;
  phase: MatchPhase;
  /** -1 during theme_writing. */
  roundIndex: number;
  totalRounds: number;
  /** null during the presentation. */
  phaseDeadlineAt: number | null;
  progress: { done: number; total: number };
  /** Private to this player. */
  task: PlayerTask;
  /** Only in `presentation`. */
  presentation: PresentationView | null;
}

export interface PlayerView {
  /** Server epoch ms when the view was sent. */
  serverNow: number;
  room: {
    code: string;
    status: RoomStatus;
    hostPlayerId: string;
    settings: MatchSettings;
    /** Ordered by joinedAt. */
    members: MemberView[];
  };
  me: { playerId: string; isHost: boolean; role: MemberRole };
  match: MatchView | null;
}
