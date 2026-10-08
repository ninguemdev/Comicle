import { defaultAvatar, ok, type MemberView, type PlayerView } from '@comicle/shared';
import { vi } from 'vitest';

import { useProfileStore } from '../stores/profile-store';
import { useRoomStore } from '../stores/room-store';

export const ROOM_CODE = 'K7PQ2M';

export function member(
  playerId: string,
  nickname: string,
  { isHost = false, connected = true }: { isHost?: boolean; connected?: boolean } = {},
): MemberView {
  return {
    playerId,
    nickname,
    avatar: defaultAvatar(),
    connected,
    isHost,
    role: 'member',
    progress: 'idle',
  };
}

/** Lobby with Ana (p1, host) and Bia (p2); `me` picks whose view it is. */
export function lobbyView({
  me = 'p1',
  members = [member('p1', 'Ana', { isHost: true }), member('p2', 'Bia')],
  status = 'lobby',
}: {
  me?: string;
  members?: MemberView[];
  status?: PlayerView['room']['status'];
} = {}): PlayerView {
  return {
    serverNow: 0,
    room: {
      code: ROOM_CODE,
      status,
      hostPlayerId: 'p1',
      settings: { mode: 'collaborative', panelCount: { kind: 'per_player' }, drawingSeconds: 90 },
      members,
    },
    me: { playerId: me, isHost: me === 'p1', role: 'member' },
    match: null,
  };
}

/** Store actions that succeed without a socket; tests override the ones they inspect. */
export function mockRoomActions() {
  return {
    connect: vi.fn(),
    createRoom: vi.fn(() => Promise.resolve(ok({ roomCode: ROOM_CODE }))),
    joinRoom: vi.fn(() => Promise.resolve(ok({ roomCode: ROOM_CODE }))),
    leaveRoom: vi.fn(() => Promise.resolve(ok({}))),
    kick: vi.fn(() => Promise.resolve(ok({}))),
    updateSettings: vi.fn(() => Promise.resolve(ok({}))),
    startMatch: vi.fn(() => Promise.resolve(ok({}))),
  };
}

/** Saved profile "Ana" and a connected room store with the given view. */
export function setUpStores(view: PlayerView | null, actions = mockRoomActions()) {
  useProfileStore.setState({
    profile: { nickname: 'Ana', avatar: defaultAvatar() },
    saved: true,
  });
  useRoomStore.setState({ view, exit: null, connection: 'connected', actions });
  return actions;
}
