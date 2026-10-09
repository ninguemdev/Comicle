import { defaultAvatar } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { inMatch, testMatch, testMember, testRoom } from '../../../test/support/room-builders';
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

describe('buildPlayerView na etapa de temas', () => {
  /** ana e bia jogam; caio estava desconectado no início e davi entrou depois. */
  function themeRoom() {
    const room = testRoom(
      testMember('ana', { joinedAt: 0 }),
      testMember('bia', { joinedAt: 1 }),
      testMember('caio', { joinedAt: 2, connected: false }),
      testMember('davi', { joinedAt: 3 }),
    );
    return inMatch(
      room,
      testMatch(['bia', 'ana'], {
        themes: new Map([
          ['ana', { draft: 'Rascunho secreto da Ana', final: null }],
          ['bia', { draft: 'Rascunho da Bia', final: 'Tema final secreto da Bia' }],
        ]),
      }),
    );
  }

  it('R24/R10: quem não tem assento é espectador; quem tem é participante', () => {
    const view = buildPlayerView(themeRoom(), 'ana', 0);

    expect(view.room.status).toBe('in_match');
    expect(view.me.role).toBe('participant');
    expect(view.room.members.map((m) => [m.playerId, m.role])).toEqual([
      ['ana', 'participant'],
      ['bia', 'participant'],
      ['caio', 'spectator'],
      ['davi', 'spectator'],
    ]);
    expect(buildPlayerView(themeRoom(), 'caio', 0).me.role).toBe('spectator');
  });

  it('R28/R49: o participante recebe o próprio rascunho ou tema final', () => {
    expect(buildPlayerView(themeRoom(), 'ana', 0).match?.task).toEqual({
      kind: 'write_theme',
      status: 'writing',
      draft: 'Rascunho secreto da Ana',
    });
    expect(buildPlayerView(themeRoom(), 'bia', 0).match?.task).toEqual({
      kind: 'write_theme',
      status: 'submitted',
      draft: 'Tema final secreto da Bia',
    });
  });

  it('R24: espectadores recebem spectate', () => {
    expect(buildPlayerView(themeRoom(), 'davi', 0).match?.task).toEqual({ kind: 'spectate' });
  });

  it('mostra o progresso público da etapa', () => {
    const view = buildPlayerView(themeRoom(), 'davi', 0);

    expect(view.match).toMatchObject({
      matchId: 'match-1',
      phase: 'theme_writing',
      roundIndex: -1,
      totalRounds: 2,
      phaseDeadlineAt: 90_000,
      progress: { done: 1, total: 2 },
      presentation: null,
    });
    expect(view.room.members.map((m) => [m.playerId, m.progress])).toEqual([
      ['ana', 'working'],
      ['bia', 'done'],
      ['caio', 'idle'],
      ['davi', 'idle'],
    ]);
  });

  it('R58: o tema de um jogador nunca aparece na view de outro', () => {
    const room = themeRoom();
    for (const playerId of ['bia', 'caio', 'davi']) {
      expect(JSON.stringify(buildPlayerView(room, playerId, 0))).not.toContain('Ana');
    }
    for (const playerId of ['ana', 'caio', 'davi']) {
      expect(JSON.stringify(buildPlayerView(room, playerId, 0))).not.toContain('Bia');
    }
  });
});

describe('buildPlayerView na rodada 0', () => {
  function drawingRoom() {
    const room = testRoom(testMember('ana'), testMember('bia'), testMember('caio'));
    const match = testMatch(['ana', 'bia'], {
      phase: 'round_drawing',
      roundIndex: 0,
      themes: new Map(),
      stories: ['ana', 'bia'].map((playerId) => ({
        id: `story-${playerId}`,
        themeId: `theme-${playerId}`,
        authorPlayerId: playerId,
        authorNickname: playerId,
        themeText: `Tema de ${playerId}`,
        themeSource: 'player' as const,
        panels: [],
      })),
    });
    return inMatch(room, match);
  }

  it('R31/R38: cada participante desenha a história do vizinho, vendo só o tema dela', () => {
    expect(buildPlayerView(drawingRoom(), 'ana', 0).match?.task).toEqual({
      kind: 'draw_panel',
      status: 'drawing',
      theme: 'Tema de bia',
      panelPosition: 0,
      hasDraft: false,
    });
    expect(buildPlayerView(drawingRoom(), 'bia', 0).match?.task).toMatchObject({
      theme: 'Tema de ana',
    });
  });

  it('R58: o espectador não vê nenhum tema durante as rodadas', () => {
    const json = JSON.stringify(buildPlayerView(drawingRoom(), 'caio', 0));

    expect(json).not.toContain('Tema de');
  });
});
