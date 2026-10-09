import {
  defaultAvatar,
  THEME_WRITING_SECONDS,
  type PlayerProfile,
  type PlayerView,
  type Rng,
} from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import type { NewMatch } from '../../src/modules/stories/story-repository';
import { ViewRecorder, waitForTimer } from '../support/room-events';
import {
  connectClient,
  connectGuest,
  startTestServer,
  type TestClient,
  type TestServer,
  type TestServerOverrides,
} from '../support/test-server';

interface Player {
  client: TestClient;
  views: ViewRecorder;
  token: string;
  profile: PlayerProfile;
}

/** Always draws the last option: shuffling reverses the order, so seats are predictable. */
const reversingRng: Rng = { nextInt: (maxExclusive) => maxExclusive - 1 };

const inPhase = (phase: string) => (view: PlayerView) => view.match?.phase === phase;
const inLobby = (view: PlayerView) => view.room.status === 'lobby' && view.match === null;

describe('partida: início e etapa de temas (integração)', () => {
  let server: TestServer;
  let repository: InMemoryStoryRepository;
  const clients: TestClient[] = [];

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await server.close();
  });

  async function start(overrides: TestServerOverrides = {}) {
    repository = new InMemoryStoryRepository();
    server = await startTestServer({ storyRepository: repository, ...overrides });
  }

  async function newPlayer(nickname: string): Promise<Player> {
    const { client, token } = await connectGuest(server);
    clients.push(client);
    return {
      client,
      token,
      views: new ViewRecorder(client),
      profile: { nickname, avatar: defaultAvatar() },
    };
  }

  async function join(player: Player, code: string) {
    const ack = await player.client.emitWithAck('room:join', {
      roomCode: code,
      profile: player.profile,
    });
    expect(ack.ok).toBe(true);
    await player.views.waitFor(() => true);
  }

  /** Ana creates the room (host); the others join in order. */
  async function room(...others: string[]): Promise<{ code: string; players: Player[] }> {
    const host = await newPlayer('Ana');
    const ack = await host.client.emitWithAck('room:create', { profile: host.profile });
    if (!ack.ok) {
      throw new Error(ack.error.code);
    }
    const code = ack.data.roomCode;
    await host.views.waitFor(() => true);
    const players = [host];
    for (const nickname of others) {
      const player = await newPlayer(nickname);
      await join(player, code);
      players.push(player);
    }
    return { code, players };
  }

  function playerIdOf(player: Player): string {
    const playerId = player.views.latest?.me.playerId;
    if (playerId === undefined) {
      throw new Error(`${player.profile.nickname} ainda não recebeu room:view`);
    }
    return playerId;
  }

  async function startMatch(host: Player): Promise<void> {
    expect(await host.client.emitWithAck('match:start', {})).toEqual({ ok: true, data: {} });
    await host.views.waitFor(inPhase('theme_writing'));
  }

  function submit(player: Player, text: string) {
    return player.client.emitWithAck('theme:submit', { text });
  }

  function hasTimer(suffix: string): boolean {
    return server.scheduler.pendingKeys().some((key) => key.endsWith(suffix));
  }

  /** Drops the connection and waits until the server marks the member as away. */
  async function drop(player: Player, observer: Player): Promise<void> {
    const nickname = player.profile.nickname;
    player.client.disconnect();
    await observer.views.waitFor(
      (view) => view.room.members.find((m) => m.nickname === nickname)?.connected === false,
    );
  }

  function persistedMatch(spy: { mock: { calls: [NewMatch][] } }): NewMatch {
    const record = spy.mock.calls[0]?.[0];
    if (!record) {
      throw new Error('createMatch não foi chamado');
    }
    return record;
  }

  it('R22: não anfitrião → NOT_HOST; 1 conectado → NOT_ENOUGH_PLAYERS; fora do lobby → INVALID_STATE', async () => {
    await start();
    const { players } = await room('Bia');
    const [ana, bia] = players;
    if (!ana || !bia) throw new Error('jogadores');

    expect(await bia.client.emitWithAck('match:start', {})).toMatchObject({
      ok: false,
      error: { code: 'NOT_HOST' },
    });

    await drop(bia, ana);
    expect(await ana.client.emitWithAck('match:start', {})).toMatchObject({
      ok: false,
      error: { code: 'NOT_ENOUGH_PLAYERS' },
    });

    const { players: others } = await room('Caio');
    const [host] = others;
    if (!host) throw new Error('anfitrião');
    await startMatch(host);
    expect(await host.client.emitWithAck('match:start', {})).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });
  });

  it('R23, R26, R29, R31: assentos pelo Rng; todos enviam → rodada 0 antes do prazo, com o tema do vizinho', async () => {
    await start({ rng: reversingRng });
    const createMatch = vi.spyOn(repository, 'createMatch');
    const { players } = await room('Bia', 'Caio');
    const [ana, bia, caio] = players;
    if (!ana || !bia || !caio) throw new Error('jogadores');

    await startMatch(ana);
    const view = await bia.views.waitFor(inPhase('theme_writing'));
    expect(view.room.status).toBe('in_match');
    expect(view.me.role).toBe('participant');
    expect(view.match).toMatchObject({
      roundIndex: -1,
      totalRounds: 3,
      progress: { done: 0, total: 3 },
      task: { kind: 'write_theme', status: 'writing', draft: '' },
    });
    expect(view.match?.phaseDeadlineAt).toBe(server.clock.now() + THEME_WRITING_SECONDS * 1000);
    expect(hasTimer(':phase')).toBe(true);

    for (const player of players) {
      expect(await submit(player, `Tema de ${player.profile.nickname}`)).toEqual({
        ok: true,
        data: {},
      });
    }

    const drawing = await ana.views.waitFor(inPhase('round_drawing'));
    expect(drawing.match).toMatchObject({ roundIndex: 0, progress: { total: 3 } });
    // R34: the theme deadline gave way to the drawing deadline.
    const phaseKey = server.scheduler.pendingKeys().find((key) => key.endsWith(':phase')) ?? '';
    expect(server.scheduler.scheduledAt(phaseKey)).toBe(drawing.match?.phaseDeadlineAt);

    // reversingRng seats them as Caio, Bia, Ana; story i belongs to seat i.
    const record = persistedMatch(createMatch);
    expect(record.themes.map((t) => [t.seat, t.authorNickname, t.text, t.source])).toEqual([
      [0, 'Caio', 'Tema de Caio', 'player'],
      [1, 'Bia', 'Tema de Bia', 'player'],
      [2, 'Ana', 'Tema de Ana', 'player'],
    ]);
    expect(record.themes.map((t) => t.authorPlayerId)).toEqual([caio, bia, ana].map(playerIdOf));
    expect(record.stories.map((s) => s.position)).toEqual([0, 1, 2]);

    // R31, round 0: seat j draws the story of seat j − 1.
    expect(drawing.match?.task).toMatchObject({ kind: 'draw_panel', theme: 'Tema de Bia' });
    const caioView = await caio.views.waitFor(inPhase('round_drawing'));
    expect(caioView.match?.task).toMatchObject({ theme: 'Tema de Ana' });
  });

  it('R24: membro desconectado no início vira espectador e recebe spectate', async () => {
    await start();
    const { players } = await room('Bia', 'Caio');
    const [ana, bia, caio] = players;
    if (!ana || !bia || !caio) throw new Error('jogadores');
    await drop(caio, ana);

    await startMatch(ana);
    const view = await ana.views.waitFor(inPhase('theme_writing'));
    expect(view.match?.progress.total).toBe(2);
    expect(view.room.members.find((m) => m.nickname === 'Caio')?.role).toBe('spectator');

    const back = await connectClient(server.url, caio.token);
    clients.push(back);
    const backViews = new ViewRecorder(back);
    expect(
      (await back.emitWithAck('room:join', { roomCode: view.room.code, profile: caio.profile })).ok,
    ).toBe(true);
    const caioView = await backViews.waitFor(inPhase('theme_writing'));
    expect(caioView.me.role).toBe('spectator');
    expect(caioView.match?.task).toEqual({ kind: 'spectate' });
  });

  it('R10: quem entra durante a partida é espectador', async () => {
    await start();
    const { code, players } = await room('Bia');
    const [ana] = players;
    if (!ana) throw new Error('jogadores');
    await startMatch(ana);

    const davi = await newPlayer('Davi');
    await join(davi, code);
    const view = await davi.views.waitFor(inPhase('theme_writing'));
    expect(view.me.role).toBe('spectator');
    expect(view.match?.task).toEqual({ kind: 'spectate' });
  });

  it('R27: tema curto demais → INVALID_PAYLOAD', async () => {
    await start();
    const { players } = await room('Bia');
    const [ana] = players;
    if (!ana) throw new Error('jogadores');
    await startMatch(ana);

    expect(await submit(ana, ' oi ')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_PAYLOAD' },
    });
  });

  it('R28: o rascunho volta na view; segundo envio → INVALID_STATE; espectador não escreve', async () => {
    await start();
    const { code, players } = await room('Bia');
    const [ana, bia] = players;
    if (!ana || !bia) throw new Error('jogadores');
    await startMatch(ana);

    expect(
      await ana.client.emitWithAck('theme:draft', { text: '  Um gato   no telhado ' }),
    ).toEqual({ ok: true, data: {} });
    const drafted = await ana.views.waitFor(
      (view) => view.match?.task.kind === 'write_theme' && view.match.task.draft !== '',
    );
    expect(drafted.match?.task).toEqual({
      kind: 'write_theme',
      status: 'writing',
      draft: 'Um gato no telhado',
    });
    // R58: Bia's view never carries Ana's draft.
    expect(JSON.stringify(bia.views.latest)).not.toContain('gato');

    expect(await submit(ana, 'Um gato no telhado')).toEqual({ ok: true, data: {} });
    const submitted = await bia.views.waitFor((view) => view.match?.progress.done === 1);
    expect(submitted.room.members.find((m) => m.nickname === 'Ana')?.progress).toBe('done');
    expect(await submit(ana, 'Outro tema')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });

    const davi = await newPlayer('Davi');
    await join(davi, code);
    expect(await submit(davi, 'Tema do espectador')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });
  });

  it('R30: prazo esgota → final > rascunho válido > reserva, com source correto', async () => {
    await start({ rng: reversingRng });
    const createMatch = vi.spyOn(repository, 'createMatch');
    const { players } = await room('Bia', 'Caio');
    const [ana, bia, caio] = players;
    if (!ana || !bia || !caio) throw new Error('jogadores');
    await startMatch(ana);

    await submit(ana, 'Final da Ana');
    await bia.client.emitWithAck('theme:draft', { text: 'Rascunho da Bia' });
    await caio.client.emitWithAck('theme:draft', { text: 'oi' });
    await server.scheduler.advanceBy(THEME_WRITING_SECONDS * 1000);

    await ana.views.waitFor(inPhase('round_drawing'));
    const record = persistedMatch(createMatch);
    expect(record.themes.map((t) => [t.authorNickname, t.source])).toEqual([
      ['Caio', 'fallback'],
      ['Bia', 'player'],
      ['Ana', 'player'],
    ]);
    expect(record.themes.map((t) => t.text).slice(1)).toEqual(['Rascunho da Bia', 'Final da Ana']);
    expect(record.themes[0]?.text).not.toBe('oi');
  });

  it('R57: abortar volta ao lobby e apaga a partida; só o anfitrião aborta', async () => {
    await start();
    const deleteMatch = vi.spyOn(repository, 'deleteMatch');
    const { players } = await room('Bia');
    const [ana, bia] = players;
    if (!ana || !bia) throw new Error('jogadores');
    await startMatch(ana);
    for (const player of players) {
      await submit(player, `Tema de ${player.profile.nickname}`);
    }
    const drawing = await ana.views.waitFor(inPhase('round_drawing'));

    expect(await bia.client.emitWithAck('match:abort', {})).toMatchObject({
      ok: false,
      error: { code: 'NOT_HOST' },
    });
    expect(await ana.client.emitWithAck('match:abort', {})).toEqual({ ok: true, data: {} });

    const lobby = await bia.views.waitFor(inLobby);
    expect(lobby.me.role).toBe('member');
    expect(deleteMatch).toHaveBeenCalledWith(drawing.match?.matchId);
    expect(hasTimer(':phase')).toBe(false);
    expect(await ana.client.emitWithAck('match:abort', {})).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });
  });

  it('R25: iniciar a segunda partida apaga a anterior que ainda estava guardada', async () => {
    await start();
    const deleteMatch = vi.spyOn(repository, 'deleteMatch');
    // The abort fails to delete the first match, so it is still stored when the next one starts.
    deleteMatch.mockRejectedValueOnce(new Error('banco fora do ar'));
    const { players } = await room('Bia');
    const [ana] = players;
    if (!ana) throw new Error('jogadores');

    await startMatch(ana);
    const firstId = ana.views.latest?.match?.matchId;
    await ana.client.emitWithAck('match:abort', {});
    await ana.views.waitFor(inLobby);
    expect(deleteMatch).toHaveBeenCalledTimes(1);

    await startMatch(ana);
    expect(deleteMatch).toHaveBeenCalledTimes(2);
    expect(deleteMatch).toHaveBeenLastCalledWith(firstId);
  });

  it('R15: participante que sai durante a partida mantém a vaga e volta com a mesma sessão', async () => {
    await start();
    const { code, players } = await room('Bia');
    const [ana, bia] = players;
    if (!ana || !bia) throw new Error('jogadores');
    await startMatch(ana);
    const biaId = playerIdOf(bia);

    expect(await bia.client.emitWithAck('room:leave', {})).toEqual({ ok: true, data: {} });
    const view = await ana.views.waitFor(
      (v) => v.room.members.find((m) => m.playerId === biaId)?.connected === false,
    );
    expect(view.room.members.find((m) => m.playerId === biaId)?.role).toBe('participant');
    expect(view.match?.progress.total).toBe(2);

    await join(bia, code);
    const back = await bia.views.waitFor(
      (v) => v.match?.task.kind === 'write_theme' && v.me.playerId === biaId,
    );
    expect(back.me.role).toBe('participant');
  });

  it('R13: desconectado durante a partida não é removido; volta a valer no lobby', async () => {
    await start();
    const { players } = await room('Bia', 'Caio');
    const [ana, , caio] = players;
    if (!ana || !caio) throw new Error('jogadores');
    await startMatch(ana);
    const caioId = playerIdOf(caio);

    await drop(caio, ana);
    expect(hasTimer(`:remove:${caioId}`)).toBe(false);

    await ana.client.emitWithAck('match:abort', {});
    await ana.views.waitFor(inLobby);
    await waitForTimer(() => server.scheduler.pendingKeys(), `:remove:${caioId}`);
  });

  it('R57: falha ao persistir os temas duas vezes aborta a partida', async () => {
    await start();
    const createMatch = vi
      .spyOn(repository, 'createMatch')
      .mockRejectedValue(new Error('banco fora do ar'));
    const { players } = await room('Bia');
    const [ana, bia] = players;
    if (!ana || !bia) throw new Error('jogadores');
    await startMatch(ana);

    await submit(ana, 'Tema da Ana');
    await submit(bia, 'Tema da Bia');
    await bia.views.waitFor(inLobby);
    expect(createMatch).toHaveBeenCalledTimes(2);
  });
});
