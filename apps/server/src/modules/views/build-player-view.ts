import type { MemberView, PlayerView } from '@comicle/shared';

import { isConnected, type Member, type Room } from '../rooms/room';

// The only place that decides what a player sees (R58, arquitetura §4 Projeção). The lobby
// part: the match part arrives with the match engine (T11).

function memberView(room: Room, member: Member): MemberView {
  return {
    playerId: member.playerId,
    nickname: member.profile.nickname,
    avatar: member.profile.avatar,
    connected: isConnected(member),
    isHost: member.playerId === room.hostPlayerId,
    role: 'member',
    progress: 'idle',
  };
}

/** View of `room` for `playerId`; `guestId` and sockets never leave the server. */
export function buildPlayerView(room: Room, playerId: string, now: number): PlayerView {
  if (!room.members.has(playerId)) {
    throw new Error(`Jogador ${playerId} não é membro da sala ${room.id}`);
  }
  return {
    serverNow: now,
    room: {
      code: room.code,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      settings: room.settings,
      members: room.orderedMembers().map((member) => memberView(room, member)),
    },
    me: { playerId, isHost: playerId === room.hostPlayerId, role: 'member' },
    match: null,
  };
}
