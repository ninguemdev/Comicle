import { DRAWING_SECONDS_DEFAULT, defaultAvatar } from '@comicle/shared';

import { buildCollaborativePlan } from '../../src/modules/game-modes/collaborative/distribution';
import type { Match } from '../../src/modules/matches/match';
import { Room, type Member } from '../../src/modules/rooms/room';

// Builders for unit tests of the rooms and matches modules.

export function testMember(
  playerId: string,
  { joinedAt = 0, connected = true }: { joinedAt?: number; connected?: boolean } = {},
): Member {
  return {
    playerId,
    guestId: `guest-${playerId}`,
    profile: { nickname: playerId, avatar: defaultAvatar() },
    joinedAt,
    connection: connected ? { socketId: `socket-${playerId}` } : { disconnectedAt: joinedAt },
  };
}

/** Room whose first member is the host. */
export function testRoom(...members: Member[]): Room {
  const [host, ...others] = members;
  if (!host) {
    throw new Error('testRoom precisa de pelo menos um membro');
  }
  const room = new Room({ id: 'room-1', code: 'K7PQ2M', createdAt: 0, host });
  for (const member of others) {
    room.members.set(member.playerId, member);
  }
  return room;
}

/** Match in `theme_writing` with these players seated in this order. */
export function testMatch(playerIds: string[], overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    settings: {
      mode: 'collaborative',
      panelCount: { kind: 'per_player' },
      drawingSeconds: DRAWING_SECONDS_DEFAULT,
    },
    startedAt: 0,
    seats: playerIds.map((playerId) => ({
      playerId,
      nickname: playerId,
      themeId: `theme-${playerId}`,
      storyId: `story-${playerId}`,
    })),
    totalRounds: playerIds.length,
    plan: buildCollaborativePlan(playerIds, playerIds.length),
    fallbackThemes: [],
    phase: 'theme_writing',
    phaseStartedAt: 0,
    phaseDeadlineAt: 90_000,
    roundIndex: -1,
    themes: new Map(playerIds.map((playerId) => [playerId, { draft: '', final: null }])),
    stories: [],
    ...overrides,
  };
}

/** Puts `room` in a match with `match`. */
export function inMatch(room: Room, match: Match): Room {
  room.status = 'in_match';
  room.match = match;
  return room;
}
