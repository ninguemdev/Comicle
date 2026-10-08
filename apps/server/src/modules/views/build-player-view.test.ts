import { defaultAvatar } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { testMember, testRoom } from '../../../test/support/room-builders';
import { buildPlayerView } from './build-player-view';

describe('buildPlayerView no lobby', () => {
  const room = () =>
    testRoom(
      testMember('ana', { joinedAt: 1 }),
      testMember('bia', { joinedAt: 3, connected: false }),
      testMember('caio', { joinedAt: 2 }),
    );

  it('mostra a sala, os membros por ordem de entrada e quem é o anfitrião', () => {
    const view = buildPlayerView(room(), 'bia', 1000);

    expect(view).toEqual({
      serverNow: 1000,
      room: {
        code: 'K7PQ2M',
        status: 'lobby',
        hostPlayerId: 'ana',
        settings: { mode: 'collaborative', panelCount: { kind: 'per_player' }, drawingSeconds: 90 },
        members: [
          {
            playerId: 'ana',
            nickname: 'ana',
            avatar: defaultAvatar(),
            connected: true,
            isHost: true,
            role: 'member',
            progress: 'idle',
          },
          {
            playerId: 'caio',
            nickname: 'caio',
            avatar: defaultAvatar(),
            connected: true,
            isHost: false,
            role: 'member',
            progress: 'idle',
          },
          {
            playerId: 'bia',
            nickname: 'bia',
            avatar: defaultAvatar(),
            connected: false,
            isHost: false,
            role: 'member',
            progress: 'idle',
          },
        ],
      },
      me: { playerId: 'bia', isHost: false, role: 'member' },
      match: null,
    });
  });

  it('me.isHost só para o anfitrião', () => {
    expect(buildPlayerView(room(), 'ana', 0).me.isHost).toBe(true);
    expect(buildPlayerView(room(), 'caio', 0).me.isHost).toBe(false);
  });

  it('R58: nunca expõe guestId nem socket', () => {
    const json = JSON.stringify(buildPlayerView(room(), 'ana', 0));

    expect(json).not.toContain('guest-');
    expect(json).not.toContain('socket-');
  });

  it('recusa montar a view de quem não é membro', () => {
    expect(() => buildPlayerView(room(), 'zé', 0)).toThrow();
  });
});
