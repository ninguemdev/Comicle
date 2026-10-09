import {
  DRAWING_SECONDS_DEFAULT,
  MAX_PLAYERS,
  type MatchSettings,
  type PlayerProfile,
  type RoomStatus,
} from '@comicle/shared';

import type { Match } from '../matches/match';

// Room aggregate (docs/modelo-de-dados.md §1). Pure: time arrives as `now`.

export type MemberConnection = { socketId: string } | { disconnectedAt: number };

export interface Member {
  /** Stable while the room exists, also across reconnections. */
  playerId: string;
  guestId: string;
  profile: PlayerProfile;
  joinedAt: number;
  connection: MemberConnection;
}

/** The member's current socket, or `null` while disconnected. */
export function socketIdOf(member: Member): string | null {
  return 'socketId' in member.connection ? member.connection.socketId : null;
}

export function isConnected(member: Member): boolean {
  return socketIdOf(member) !== null;
}

/** R19. */
export function defaultMatchSettings(): MatchSettings {
  return {
    mode: 'collaborative',
    panelCount: { kind: 'per_player' },
    drawingSeconds: DRAWING_SECONDS_DEFAULT,
  };
}

export interface NewRoom {
  id: string;
  code: string;
  createdAt: number;
  /** R8: whoever creates the room is its host. */
  host: Member;
}

export class Room {
  readonly id: string;
  readonly code: string;
  readonly createdAt: number;
  /** Insertion order is join order, which breaks ties between equal `joinedAt`. */
  readonly members = new Map<string, Member>();
  /** R12: kicked sessions, until the room closes. */
  readonly bannedGuestIds = new Set<string>();
  status: RoomStatus = 'lobby';
  settings: MatchSettings = defaultMatchSettings();
  /** The match in progress; `null` in the lobby. */
  match: Match | null = null;
  /** R25: the latest match whose content is still stored, deleted when the next one starts. */
  lastMatchId: string | null = null;
  /** Always a member of the room. */
  hostPlayerId: string;
  /** R14: the role is waiting for the first member to connect (nobody was connected). */
  hostTransferPending = false;
  /** R16: since when nobody is connected. */
  emptySince: number | null = null;
  /** Set when closing starts; from then on the room accepts nothing. */
  closed = false;
  private queue: Promise<unknown> = Promise.resolve();

  constructor({ id, code, createdAt, host }: NewRoom) {
    this.id = id;
    this.code = code;
    this.createdAt = createdAt;
    this.members.set(host.playerId, host);
    this.hostPlayerId = host.playerId;
  }

  /**
   * Runs `task` after every task queued before it (arquitetura §4, Serialização por sala), so
   * no two mutations of this room interleave across `await`s.
   */
  runExclusive<T>(task: () => T | Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    // A failed task rejects for its caller but must not stall the queue.
    this.queue = result.catch(() => undefined);
    return result;
  }

  memberByGuest(guestId: string): Member | undefined {
    for (const member of this.members.values()) {
      if (member.guestId === guestId) {
        return member;
      }
    }
    return undefined;
  }

  /** Ordered by `joinedAt`; the sort is stable, so ties keep join order. */
  orderedMembers(): Member[] {
    return [...this.members.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  }

  connectedMembers(): Member[] {
    return this.orderedMembers().filter(isConnected);
  }

  /** R9. */
  isFull(): boolean {
    return this.members.size >= MAX_PLAYERS;
  }
}
