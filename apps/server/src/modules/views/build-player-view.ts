import {
  defaultAvatar,
  type MatchView,
  type MemberProgress,
  type MemberRole,
  type MemberView,
  type PanelRef,
  type PlayerTask,
  type PlayerView,
} from '@comicle/shared';

import { readablePanels } from '../drawing/panel-access-policy';
import { assignedStory, isParticipant, seatOf, type Match, type PanelMeta } from '../matches/match';
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

/** Whether the participant finished what the current phase asks; `null` when it asks nothing. */
function isDone(match: Match, playerId: string): boolean | null {
  switch (match.phase) {
    case 'theme_writing':
      return hasSubmittedTheme(match, playerId);
    case 'round_reading':
      return match.round?.ready.has(playerId) ?? false;
    case 'round_drawing':
    case 'round_closing':
      return match.round?.finals.has(playerId) ?? false;
    case 'presentation':
      return null;
    default:
      return match.phase satisfies never;
  }
}

/** Public progress in the current phase: never says what anyone wrote or drew. */
function progressOf(match: Match | null, playerId: string): MemberProgress {
  if (match === null || !isParticipant(match, playerId)) {
    return 'idle';
  }
  const done = isDone(match, playerId);
  if (done === null) {
    return 'idle';
  }
  return done ? 'done' : 'working';
}

/** Credits of a panel: the nickname copied at the start and the artist's current avatar. */
function panelRef(room: Room, match: Match, panel: PanelMeta): PanelRef {
  const avatar = room.members.get(panel.artistPlayerId)?.profile.avatar ?? defaultAvatar();
  return {
    panelId: panel.id,
    position: panel.position,
    artist: {
      playerId: panel.artistPlayerId,
      nickname: seatOf(match, panel.artistPlayerId)?.nickname ?? '',
      avatar,
    },
    status: panel.status,
  };
}

function participantTask(room: Room, match: Match, playerId: string): PlayerTask {
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
    case 'round_reading': {
      const story = assignedStory(match, playerId);
      if (!story) {
        return { kind: 'wait' };
      }
      // R36: the panels only until the player confirms; afterwards just the theme.
      return match.round?.ready.has(playerId)
        ? { kind: 'read_story', status: 'ready', theme: story.themeText }
        : {
            kind: 'read_story',
            status: 'reading',
            theme: story.themeText,
            previousPanels: readablePanels(match, playerId).map((panel) =>
              panelRef(room, match, panel),
            ),
          };
    }
    case 'round_drawing': {
      const story = assignedStory(match, playerId);
      // R38: only the theme of the story being drawn; never its panels.
      return story
        ? {
            kind: 'draw_panel',
            status: match.round?.finals.has(playerId) ? 'submitted' : 'drawing',
            theme: story.themeText,
            panelPosition: match.roundIndex,
            // R48: whether `GET /api/rooms/:code/my-draft` has something to restore.
            hasDraft: match.round?.drafts.has(playerId) ?? false,
          }
        : { kind: 'wait' };
    }
    case 'round_closing':
      return { kind: 'wait' };
    case 'presentation':
      return { kind: 'watch' };
    default:
      return match.phase satisfies never;
  }
}

function taskOf(room: Room, match: Match, playerId: string): PlayerTask {
  if (isParticipant(match, playerId)) {
    return participantTask(room, match, playerId);
  }
  return match.phase === 'presentation' ? { kind: 'watch' } : { kind: 'spectate' };
}

function matchView(room: Room, match: Match, playerId: string): MatchView {
  const done = match.seats.filter((seat) => isDone(match, seat.playerId) === true).length;
  return {
    matchId: match.id,
    phase: match.phase,
    roundIndex: match.roundIndex,
    totalRounds: match.totalRounds,
    phaseDeadlineAt: match.phaseDeadlineAt,
    progress: { done, total: match.seats.length },
    task: taskOf(room, match, playerId),
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
    match: room.match === null ? null : matchView(room, room.match, playerId),
  };
}
