import { defaultAvatar } from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import {
  inMatch,
  testMatch,
  testMember,
  testRoom,
  testRoundMatch,
  testStories,
} from '../../../test/support/room-builders';
import type { Match } from '../matches/match';
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

describe('buildPlayerView nas rodadas', () => {
  /** ana, bia e caio jogam (nessa ordem de assentos); davi é espectador. */
  function roundRoom(match: Match) {
    const room = testRoom(
      testMember('ana', { joinedAt: 0 }),
      testMember('bia', { joinedAt: 1 }),
      testMember('caio', { joinedAt: 2 }),
      testMember('davi', { joinedAt: 3 }),
    );
    return inMatch(room, match);
  }
  const players = ['ana', 'bia', 'caio'];
  const viewOf = (match: Match, playerId: string) => buildPlayerView(roundRoom(match), playerId, 0);
  const taskOf = (match: Match, playerId: string) => viewOf(match, playerId).match?.task;

  it('R36: na leitura, quem não confirmou vê o tema e os quadros anteriores da história recebida', () => {
    // Round 1 (R31): ana reads bia's story, whose panel 0 caio drew.
    const reading = testRoundMatch(players, 'round_reading', 1);

    expect(taskOf(reading, 'ana')).toEqual({
      kind: 'read_story',
      status: 'reading',
      theme: 'Tema de bia',
      previousPanels: [
        {
          panelId: 'panel-0-bia',
          position: 0,
          artist: { playerId: 'caio', nickname: 'caio', avatar: defaultAvatar() },
          status: 'complete',
        },
      ],
    });
  });

  it('R36: depois de round:ready, a leitura só traz o tema', () => {
    const reading = testRoundMatch(players, 'round_reading', 1, { ready: new Set(['ana']) });

    expect(taskOf(reading, 'ana')).toEqual({
      kind: 'read_story',
      status: 'ready',
      theme: 'Tema de bia',
    });
    expect(JSON.stringify(viewOf(reading, 'ana'))).not.toContain('panel-');
  });

  it('R58: na leitura, ninguém recebe quadros nem temas de histórias que não recebeu', () => {
    // Round 1 (R31): bia reads caio's story.
    const reading = testRoundMatch(players, 'round_reading', 1);
    const json = JSON.stringify(viewOf(reading, 'bia'));

    expect(json).toContain('panel-0-caio');
    expect(json).not.toMatch(/panel-\d-(ana|bia)/);
    expect(json).not.toMatch(/Tema de (ana|bia)/);
    expect(JSON.stringify(viewOf(reading, 'davi'))).not.toMatch(/panel-|Tema de/);
    expect(taskOf(reading, 'davi')).toEqual({ kind: 'spectate' });
  });

  it('R38/R58: a view de desenho nunca contém quadros; hasDraft e status acompanham o jogador', () => {
    const drawing = testRoundMatch(players, 'round_drawing', 2, {
      drafts: new Map([['ana', new Uint8Array([1])]]),
      finals: new Map([['bia', { png: null, reason: 'done' }]]),
    });

    expect(taskOf(drawing, 'ana')).toEqual({
      kind: 'draw_panel',
      status: 'drawing',
      theme: 'Tema de ana',
      panelPosition: 2,
      hasDraft: true,
    });
    expect(taskOf(drawing, 'bia')).toMatchObject({ status: 'submitted', hasDraft: false });
    for (const playerId of [...players, 'davi']) {
      expect(JSON.stringify(viewOf(drawing, playerId))).not.toContain('panel-');
    }
  });

  it('no fechamento os participantes esperam', () => {
    const closing = testRoundMatch(players, 'round_closing', 0);

    expect(taskOf(closing, 'ana')).toEqual({ kind: 'wait' });
    expect(taskOf(closing, 'davi')).toEqual({ kind: 'spectate' });
  });

  it('o progresso conta quem confirmou a leitura e quem entregou o quadro', () => {
    const reading = testRoundMatch(players, 'round_reading', 1, { ready: new Set(['bia']) });
    const view = viewOf(reading, 'davi');
    expect(view.match?.progress).toEqual({ done: 1, total: 3 });
    expect(view.room.members.map((m) => m.progress)).toEqual([
      'working',
      'done',
      'working',
      'idle',
    ]);

    const closing = testRoundMatch(players, 'round_closing', 1, {
      finals: new Map([
        ['ana', { png: null, reason: 'done' }],
        ['caio', { png: null, reason: 'timeout' }],
      ]),
    });
    expect(viewOf(closing, 'davi').match?.progress).toEqual({ done: 2, total: 3 });
  });

  it('R45: na apresentação todos recebem watch, sem prazo', () => {
    const presentation = testMatch(players, {
      phase: 'presentation',
      roundIndex: 2,
      phaseDeadlineAt: null,
      themes: new Map(),
      stories: testStories(players, 3),
    });

    for (const playerId of [...players, 'davi']) {
      expect(viewOf(presentation, playerId).match).toMatchObject({
        phase: 'presentation',
        phaseDeadlineAt: null,
        task: { kind: 'watch' },
        progress: { done: 0, total: 3 },
      });
    }
  });
});
