import { defaultAvatar } from '@comicle/shared';

import { Room, type Member } from '../../src/modules/rooms/room';

// Builders for unit tests of the rooms module.

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
