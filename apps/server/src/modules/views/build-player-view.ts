import type {
  MatchView,
  MemberProgress,
  MemberRole,
  MemberView,
  PlayerTask,
  PlayerView,
} from '@comicle/shared';

import { storyForPlayer } from '../game-modes/game-mode';
import { isParticipant, type Match } from '../matches/match';
import { isConnected, type Member, type Room } from '../rooms/room';

// The only place that decides what a player sees (R58, arquitetura §4 Projeção).

/** R10, R24: outside `seats` during a match means spectator. */
function roleOf(match: Match | null, playerId: string): MemberRole {
  if (match === null) {
    return 'member';
  }
  return isParticipant(match, playerId) ? 'participant' : 'spectator';
}

function hasSubmittedTheme(match: Match, playerId: string): boolean {
  return (match.themes.get(playerId)?.final ?? null) !== null;
}

/** Public progress in the current phase: never says what anyone wrote or drew. */
function progressOf(match: Match | null, playerId: string): MemberProgress {
  if (match === null || !isParticipant(match, playerId)) {
    return 'idle';
  }
  switch (match.phase) {
    case 'theme_writing':
      return hasSubmittedTheme(match, playerId) ? 'done' : 'working';
    case 'round_reading':
    case 'round_drawing':
      return 'working';
    case 'round_closing':
    case 'presentation':
      return 'idle';
    default:
      return match.phase satisfies never;
  }
}

function participantTask(match: Match, playerId: string): PlayerTask {
  switch (match.phase) {
    case 'theme_writing': {
      const theme = match.themes.get(playerId);
      const submitted = theme?.final ?? null;
      // R49: the player's own draft (or final theme) comes back with every view.
      return {
        kind: 'write_theme',
        status: submitted === null ? 'writing' : 'submitted',
        draft: submitted ?? theme?.draft ?? '',
      };
    }
    case 'round_drawing': {
      const storyIndex = storyForPlayer(match.plan, match.roundIndex, playerId);
      const story = storyIndex === undefined ? undefined : match.stories[storyIndex];
      // R38: only the theme of the story being drawn; never its panels.
      return story
        ? {
            kind: 'draw_panel',
            status: 'drawing',
            theme: story.themeText,
            panelPosition: match.roundIndex,
            hasDraft: false,
          }
        : { kind: 'wait' };
    }
    case 'round_reading':
    case 'round_closing':
      return { kind: 'wait' };
    case 'presentation':
      return { kind: 'watch' };
    default:
      return match.phase satisfies never;
  }
}

function taskOf(match: Match, playerId: string): PlayerTask {
  if (isParticipant(match, playerId)) {
    return participantTask(match, playerId);
  }
  return match.phase === 'presentation' ? { kind: 'watch' } : { kind: 'spectate' };
}

function matchView(match: Match, playerId: string): MatchView {
  const done =
    match.phase === 'theme_writing'
      ? match.seats.filter((seat) => hasSubmittedTheme(match, seat.playerId)).length
      : 0;
  return {
    matchId: match.id,
    phase: match.phase,
    roundIndex: match.roundIndex,
    totalRounds: match.totalRounds,
    phaseDeadlineAt: match.phaseDeadlineAt,
    progress: { done, total: match.seats.length },
    task: taskOf(match, playerId),
    presentation: null,
  };
}

function memberView(room: Room, member: Member): MemberView {
  return {
    playerId: member.playerId,
    nickname: member.profile.nickname,
    avatar: member.profile.avatar,
    connected: isConnected(member),
    isHost: member.playerId === room.hostPlayerId,
    role: roleOf(room.match, member.playerId),
    progress: progressOf(room.match, member.playerId),
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
    me: {
      playerId,
      isHost: playerId === room.hostPlayerId,
      role: roleOf(room.match, playerId),
    },
    match: room.match === null ? null : matchView(room.match, playerId),
  };
}
