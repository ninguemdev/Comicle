import {
  defaultAvatar,
  type PlayerProfile,
  type PlayerTask,
  type PlayerView,
} from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultMatchSettings } from '../../src/modules/rooms/room';
import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import type { NewPanel } from '../../src/modules/stories/story-repository';
import { fastGameTiming } from '../../src/modules/timing/game-timing';
import { panelPng } from '../support/panel-png';
import { nextDisconnect, nextSessionReplaced, ViewRecorder } from '../support/room-events';
import {
  connectClient,
  connectGuest,
  startTestServer,
  type TestClient,
  type TestServer,
} from '../support/test-server';

// T18: what each phase does when a connection drops and comes back (docs/cenarios-de-reconexao.md).

interface Player {
  client: TestClient;
  views: ViewRecorder;
  token: string;
  profile: PlayerProfile;
}

const timing = fastGameTiming;
const DRAWING_MS = timing.drawingMs(defaultMatchSettings());

const inPhase = (phase: string, roundIndex?: number) => (view: PlayerView) =>
  view.match?.phase === phase && (roundIndex === undefined || view.match.roundIndex === roundIndex);

function taskOf(player: Player): PlayerTask | undefined {
  return player.views.latest?.match?.task;
}

describe('reconexão (integração)', () => {
  let server: TestServer;
  let repository: InMemoryStoryRepository;
  let code: string;
  const clients: TestClient[] = [];

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await server.close();
  });

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

  /** Ana (host), Bia and Caio in a fresh room, in this order. */
  async function room(): Promise<[Player, Player, Player]> {
    repository = new InMemoryStoryRepository();
    server = await startTestServer({ storyRepository: repository, timing });
    const ana = await newPlayer('Ana');
    const created = await ana.client.emitWithAck('room:create', { profile: ana.profile });
    if (!created.ok) throw new Error(created.error.code);
    code = created.data.roomCode;
    await ana.views.waitFor(() => true);
    const bia = await newPlayer('Bia');
    const caio = await newPlayer('Caio');
    for (const player of [bia, caio]) {
      const ack = await player.client.emitWithAck('room:join', {
        roomCode: code,
        profile: player.profile,
      });
      expect(ack.ok).toBe(true);
      await player.views.waitFor(() => true);
    }
    return [ana, bia, caio];
  }

  async function startMatch(players: Player[]): Promise<void> {
    const [host] = players;
    expect((await host?.client.emitWithAck('match:start', {}))?.ok).toBe(true);
    for (const player of players) {
      await player.views.waitFor(inPhase('theme_writing'));
    }
  }

  async function submitThemes(players: Player[]): Promise<void> {
    for (const player of players) {
      const text = `Tema de ${player.profile.nickname}`;
      expect((await player.client.emitWithAck('theme:submit', { text })).ok).toBe(true);
    }
  }

  /** Everyone hands in round `roundIndex` (confirming the reading first, from round 1). */
  async function playRound(players: Player[], roundIndex: number): Promise<void> {
    if (roundIndex > 0) {
      for (const player of players) {
        await player.views.waitFor(inPhase('round_reading', roundIndex));
        await player.client.emitWithAck('round:ready', { roundIndex });
      }
    }
    for (const player of players) {
      await player.views.waitFor(inPhase('round_drawing', roundIndex));
      const ack = await player.client.emitWithAck('panel:submit', {
        roundIndex,
        reason: 'done',
        png: panelPng(roundIndex + 1),
      });
      expect(ack.ok).toBe(true);
    }
  }

  /** Closes the connection and waits until the others see the player away. */
  async function drop(player: Player, witness: Player): Promise<void> {
    player.client.disconnect();
    await witness.views.waitFor(
      (view) =>
        view.room.members.find((m) => m.nickname === player.profile.nickname)?.connected === false,
    );
  }

  /** Same session on a new connection, back in the room: like reloading the page. */
  async function reopen(player: Player): Promise<Player> {
    const client = await connectClient(server.url, player.token);
    clients.push(client);
    const back = { ...player, client, views: new ViewRecorder(client) };
    const ack = await client.emitWithAck('room:join', { roomCode: code, profile: player.profile });
    expect(ack.ok).toBe(true);
    await back.views.waitFor(() => true);
    return back;
  }

  function get(path: string, token: string): Promise<Response> {
    return fetch(`${server.url}${path}`, { headers: { authorization: `Bearer ${token}` } });
  }

  it('R49: o rascunho do tema volta depois de reconectar', async () => {
    const [ana, bia, caio] = await room();
    await startMatch([ana, bia, caio]);
    await bia.client.emitWithAck('theme:draft', { text: 'Um gato astronauta' });

    await drop(bia, ana);
    const back = await reopen(bia);

    expect(taskOf(back)).toEqual({
      kind: 'write_theme',
      status: 'writing',
      draft: 'Um gato astronauta',
    });
  });

  it('R47: quem cai antes de confirmar a leitura volta vendo os quadros; depois, volta sem eles', async () => {
    const players = await room();
    const [ana, bia] = players;
    await startMatch(players);
    await submitThemes(players);
    await playRound(players, 0);
    await bia.views.waitFor(inPhase('round_reading', 1));

    await drop(bia, ana);
    let back = await reopen(bia);
    const reading = taskOf(back);
    if (reading?.kind !== 'read_story' || reading.status !== 'reading') {
      throw new Error(`esperava a leitura, veio ${JSON.stringify(reading)}`);
    }
    expect(reading.previousPanels).toHaveLength(1);
    const panelId = reading.previousPanels[0]?.panelId ?? '';
    expect((await get(`/api/panels/${panelId}`, bia.token)).status).toBe(200);

    expect((await back.client.emitWithAck('round:ready', { roundIndex: 1 })).ok).toBe(true);
    await drop(back, ana);
    back = await reopen(back);

    expect(taskOf(back)).toMatchObject({ kind: 'read_story', status: 'ready' });
    expect(JSON.stringify(back.views.latest)).not.toContain(panelId);
    expect((await get(`/api/panels/${panelId}`, bia.token)).status).toBe(403);
  });

  it('R48: quem cai no desenho depois de um autosave volta com hasDraft e baixa o rascunho', async () => {
    const players = await room();
    const [ana, bia] = players;
    await startMatch(players);
    await submitThemes(players);
    await bia.views.waitFor(inPhase('round_drawing', 0));
    const draft = panelPng(7);
    expect((await bia.client.emitWithAck('panel:autosave', { roundIndex: 0, png: draft })).ok).toBe(
      true,
    );

    await drop(bia, ana);
    const back = await reopen(bia);

    expect(taskOf(back)).toMatchObject({ kind: 'draw_panel', status: 'drawing', hasDraft: true });
    const response = await get(`/api/rooms/${code}/my-draft`, bia.token);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(draft);
  });

  it('R46: participante desconectado a partida inteira fica com quadros vazios e a partida chega ao fim', async () => {
    const players = await room();
    const [ana, bia, caio] = players;
    const saveRoundPanels = vi.spyOn(repository, 'saveRoundPanels');
    await startMatch(players);
    await drop(caio, ana);
    await submitThemes([ana, bia]);
    // R30: the themes wait for their deadline; Caio's story gets a fallback theme.
    await server.scheduler.advanceBy(timing.themeWritingMs);

    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      // R37: Caio, away, does not hold the reading; R41: but the drawing waits for its deadline.
      await playRound([ana, bia], roundIndex);
      expect(ana.views.latest?.match?.phase).toBe('round_drawing');
      await server.scheduler.advanceBy(DRAWING_MS);
      await server.scheduler.advanceBy(timing.roundClosingMs);
    }

    const final = await ana.views.waitFor(inPhase('presentation'));
    expect(final.match?.task).toEqual({ kind: 'watch' });
    const caioId = final.room.members.find((m) => m.nickname === 'Caio')?.playerId;
    const caioPanels = saveRoundPanels.mock.calls
      .flatMap((call) => call[1])
      .filter((panel: NewPanel) => panel.artistPlayerId === caioId);
    expect(caioPanels.map((panel) => panel.status)).toEqual(['empty', 'empty', 'empty']);
  });

  it('R14 na apresentação: anfitrião sumido por HOST_TRANSFER_GRACE_MS → o novo anfitrião navega', async () => {
    const players = await room();
    const [ana, bia] = players;
    await startMatch(players);
    await submitThemes(players);
    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      await playRound(players, roundIndex);
    }
    await bia.views.waitFor(inPhase('presentation'));

    await drop(ana, bia);
    expect(await bia.client.emitWithAck('presentation:navigate', { action: 'next' })).toMatchObject(
      { ok: false, error: { code: 'NOT_HOST' } },
    );

    await server.scheduler.advanceBy(timing.hostTransferGraceMs);
    await bia.views.waitFor((view) => view.me.isHost);

    expect(await bia.client.emitWithAck('presentation:navigate', { action: 'next' })).toEqual({
      ok: true,
      data: {},
    });
    const view = await bia.views.waitFor(
      (current) => current.match?.presentation?.step.kind === 'panel',
    );
    expect(view.match?.presentation?.step).toEqual({ kind: 'panel', position: 0 });
  });

  it('R5 em partida: a segunda aba assume, a primeira recebe session:replaced e a vaga continua', async () => {
    const players = await room();
    const [ana, bia] = players;
    await startMatch(players);
    await submitThemes(players);
    await bia.views.waitFor(inPhase('round_drawing', 0));
    const playerId = bia.views.latest?.me.playerId;
    const replaced = nextSessionReplaced(bia.client);
    const closed = nextDisconnect(bia.client);

    const second = await reopen(bia);
    await replaced;
    await closed;

    expect(second.views.latest?.me).toMatchObject({ playerId, role: 'participant' });
    expect(taskOf(second)).toMatchObject({ kind: 'draw_panel', status: 'drawing' });
    // The old connection dropping must not leave Bia away.
    await ana.client.emitWithAck('panel:submit', { roundIndex: 0, reason: 'done', png: null });
    const view = await ana.views.waitFor((current) => current.match?.progress.done === 1);
    expect(view.room.members.find((m) => m.nickname === 'Bia')?.connected).toBe(true);
    expect(
      (
        await second.client.emitWithAck('panel:submit', {
          roundIndex: 0,
          reason: 'done',
          png: panelPng(2),
        })
      ).ok,
    ).toBe(true);
  });

  it('R16: todos desconectados por EMPTY_ROOM_TTL_MS no meio da partida → sala encerrada e conteúdo apagado', async () => {
    const players = await room();
    const [ana, bia, caio] = players;
    const saveRoundPanels = vi.spyOn(repository, 'saveRoundPanels');
    const deleteRoom = vi.spyOn(repository, 'deleteRoom');
    await startMatch(players);
    await submitThemes(players);
    await playRound(players, 0);
    await ana.views.waitFor(inPhase('round_reading', 1));
    const panelId = saveRoundPanels.mock.calls[0]?.[1][0]?.id ?? '';
    expect(await repository.getPanelImage(panelId)).not.toBeNull();

    await drop(caio, ana);
    await drop(bia, ana);
    ana.client.disconnect();
    await vi.waitFor(() => {
      expect(server.scheduler.pendingKeys().some((key) => key.endsWith(':empty'))).toBe(true);
    });

    await server.scheduler.advanceBy(timing.emptyRoomTtlMs);

    expect(deleteRoom).toHaveBeenCalledTimes(1);
    expect(await repository.getPanelImage(panelId)).toBeNull();
    expect(server.scheduler.pendingKeys().filter((key) => key.startsWith('room:'))).toEqual([]);
    const lookup = await server.http.inject({ method: 'GET', url: `/api/rooms/${code}` });
    expect(lookup.statusCode).toBe(404);
    // Coming back finds no room (the client shows "Sala encerrada").
    const client = await connectClient(server.url, ana.token);
    clients.push(client);
    expect(
      await client.emitWithAck('room:join', { roomCode: code, profile: ana.profile }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_NOT_FOUND' } });
  });
});
