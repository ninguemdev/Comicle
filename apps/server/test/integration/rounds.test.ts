import {
  defaultAvatar,
  type MatchAbortReason,
  type PlayerProfile,
  type PlayerTask,
  type PlayerView,
} from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultMatchSettings } from '../../src/modules/rooms/room';
import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import { fastGameTiming } from '../../src/modules/timing/game-timing';
import { panelPng } from '../support/panel-png';
import { ViewRecorder } from '../support/room-events';
import {
  connectClient,
  connectGuest,
  startTestServer,
  type TestClient,
  type TestServer,
} from '../support/test-server';

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
const inLobby = (view: PlayerView) => view.room.status === 'lobby' && view.match === null;

function taskOf(view: PlayerView | undefined): PlayerTask | undefined {
  return view?.match?.task;
}

/** `kind:status` of the player's task, e.g. `read_story:ready`. */
function taskState(view: PlayerView | undefined): string {
  const task = taskOf(view);
  if (!task) {
    return 'none';
  }
  return 'status' in task ? `${task.kind}:${task.status}` : task.kind;
}

describe('rodadas (integração)', () => {
  let server: TestServer;
  let repository: InMemoryStoryRepository;
  const clients: TestClient[] = [];

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await server.close();
  });

  async function start() {
    repository = new InMemoryStoryRepository();
    server = await startTestServer({ storyRepository: repository, timing });
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
      const joined = await player.client.emitWithAck('room:join', {
        roomCode: code,
        profile: player.profile,
      });
      expect(joined.ok).toBe(true);
      await player.views.waitFor(() => true);
      players.push(player);
    }
    return { code, players };
  }

  /** Room of Ana, Bia and Caio already drawing round 0. */
  async function drawingRound0(): Promise<{ code: string; players: [Player, Player, Player] }> {
    const { code, players } = await room('Bia', 'Caio');
    const [ana, bia, caio] = players;
    if (!ana || !bia || !caio) throw new Error('jogadores');
    expect((await ana.client.emitWithAck('match:start', {})).ok).toBe(true);
    for (const player of players) {
      await player.views.waitFor(inPhase('theme_writing'));
      const ack = await player.client.emitWithAck('theme:submit', {
        text: `Tema de ${player.profile.nickname}`,
      });
      expect(ack.ok).toBe(true);
    }
    for (const player of players) {
      await player.views.waitFor(inPhase('round_drawing', 0));
    }
    return { code, players: [ana, bia, caio] };
  }

  function done(player: Player, roundIndex: number, marker = 1) {
    return player.client.emitWithAck('panel:submit', {
      roundIndex,
      reason: 'done',
      png: panelPng(marker),
    });
  }

  function ready(player: Player, roundIndex: number) {
    return player.client.emitWithAck('round:ready', { roundIndex });
  }

  function get(path: string, token: string): Promise<Response> {
    return fetch(`${server.url}${path}`, { headers: { authorization: `Bearer ${token}` } });
  }

  function previousPanelIds(player: Player): string[] {
    const task = taskOf(player.views.latest);
    return task?.kind === 'read_story' && task.status === 'reading'
      ? task.previousPanels.map((panel) => panel.panelId)
      : [];
  }

  function nextAborted(client: TestClient): Promise<{ reason: MatchAbortReason }> {
    return new Promise((resolve) => {
      client.once('match:aborted', resolve);
    });
  }

  it('R34, R36, R38, R45: partida de 3 jogadores e 3 quadros vai do início à apresentação', async () => {
    await start();
    const saveRoundPanels = vi.spyOn(repository, 'saveRoundPanels');
    const { players } = await drawingRound0();

    // R34, R38: round 0 starts straight at drawing, with one deadline for everyone.
    const deadlines = players.map((p) => p.views.latest?.match?.phaseDeadlineAt);
    expect(new Set(deadlines).size).toBe(1);
    expect(taskOf(players[0].views.latest)).toMatchObject({
      kind: 'draw_panel',
      status: 'drawing',
      panelPosition: 0,
      hasDraft: false,
    });

    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      if (roundIndex > 0) {
        for (const player of players) {
          const view = await player.views.waitFor(inPhase('round_reading', roundIndex));
          const task = taskOf(view);
          expect(task).toMatchObject({ kind: 'read_story', status: 'reading' });
          expect(previousPanelIds(player)).toHaveLength(roundIndex);
          // R36: before round:ready, the image is there (panel 0 was drawn with marker 1).
          const [panelId] = previousPanelIds(player);
          const image = await get(`/api/panels/${String(panelId)}`, player.token);
          expect(image.status).toBe(200);
          expect(image.headers.get('cache-control')).toBe('private, no-store');
          expect(image.headers.get('content-type')).toBe('image/png');
          expect(new Uint8Array(await image.arrayBuffer())).toEqual(panelPng(1));

          expect(await ready(player, roundIndex)).toEqual({ ok: true, data: {} });
          // R36: afterwards, it leaves the view and the image is refused.
          const after = await player.views.waitFor((v) => taskState(v) !== 'read_story:reading');
          expect(JSON.stringify(after)).not.toContain(String(panelId));
          expect((await get(`/api/panels/${String(panelId)}`, player.token)).status).toBe(403);
        }
        const drawing = await Promise.all(
          players.map((p) => p.views.waitFor(inPhase('round_drawing', roundIndex))),
        );
        expect(new Set(drawing.map((v) => v.match?.phaseDeadlineAt)).size).toBe(1);
        // R58: the drawing view never carries panels.
        expect(JSON.stringify(drawing)).not.toContain('panelId');
      }
      for (const player of players) {
        expect(await done(player, roundIndex, roundIndex + 1)).toEqual({ ok: true, data: {} });
      }
    }

    const final = await players[1].views.waitFor(inPhase('presentation'));
    expect(final.match).toMatchObject({
      roundIndex: 2,
      phaseDeadlineAt: null,
      task: { kind: 'watch' },
    });
    expect(saveRoundPanels).toHaveBeenCalledTimes(3);
    for (const [index, call] of saveRoundPanels.mock.calls.entries()) {
      expect(call[1].map((p) => [p.position, p.status])).toEqual([
        [index, 'complete'],
        [index, 'complete'],
        [index, 'complete'],
      ]);
    }
    expect(server.scheduler.pendingKeys().some((key) => key.endsWith(':phase'))).toBe(false);
  });

  it('R37: o prazo da leitura confirma quem faltou; desconectado não segura a fase', async () => {
    await start();
    const { players } = await drawingRound0();
    const [ana, bia, caio] = players;
    for (const player of players) {
      await done(player, 0);
    }
    await ana.views.waitFor(inPhase('round_reading', 1));

    // Ana confirms; Caio drops; Bia confirming then is enough.
    await ready(ana, 1);
    caio.client.disconnect();
    await ana.views.waitFor(
      (v) => v.room.members.find((m) => m.nickname === 'Caio')?.connected === false,
    );
    expect(ana.views.latest?.match?.phase).toBe('round_reading');
    await ready(bia, 1);
    await ana.views.waitFor(inPhase('round_drawing', 1));

    // Round 2: nobody confirms; the deadline does it for them.
    await done(ana, 1);
    await done(bia, 1);
    await server.scheduler.advanceBy(DRAWING_MS);
    await server.scheduler.advanceBy(timing.roundClosingMs);
    const reading = await ana.views.waitFor(inPhase('round_reading', 2));
    expect(reading.match?.phaseDeadlineAt).toBe(server.clock.now() + timing.readingMs(2));
    await server.scheduler.advanceBy(timing.readingMs(2));
    const drawing = await bia.views.waitFor(inPhase('round_drawing', 2));
    expect(drawing.match?.progress).toEqual({ done: 0, total: 3 });
  });

  it('R41, R42: um desconectado sem concluir faz o desenho esperar o prazo; o fechamento recolhe o resto', async () => {
    await start();
    const saveRoundPanels = vi.spyOn(repository, 'saveRoundPanels');
    const { players } = await drawingRound0();
    const [ana, bia, caio] = players;

    await done(ana, 0);
    caio.client.disconnect();
    await ana.views.waitFor(
      (v) => v.room.members.find((m) => m.nickname === 'Caio')?.connected === false,
    );
    expect(ana.views.latest?.match?.phase).toBe('round_drawing');

    const collect = new Promise<{ roundIndex: number }>((resolve) => {
      bia.client.once('round:collect', resolve);
    });
    await server.scheduler.advanceBy(DRAWING_MS);
    expect(await collect).toEqual({ roundIndex: 0 });
    await bia.views.waitFor(inPhase('round_closing', 0));
    expect(taskOf(bia.views.latest)).toEqual({ kind: 'wait' });
    expect(
      await bia.client.emitWithAck('panel:submit', {
        roundIndex: 0,
        reason: 'timeout',
        png: panelPng(2),
      }),
    ).toEqual({ ok: true, data: {} });

    await server.scheduler.advanceBy(timing.roundClosingMs);
    await ana.views.waitFor(inPhase('round_reading', 1));
    const statuses = saveRoundPanels.mock.calls[0]?.[1].map((p) => [p.artistNickname, p.status]);
    expect(statuses).toEqual(
      expect.arrayContaining([
        ['Ana', 'complete'],
        ['Bia', 'partial'],
        ['Caio', 'empty'],
      ]),
    );
  });

  it('R40/R44: envio repetido, rodada errada e fora da fase → erros corretos', async () => {
    await start();
    const { players } = await drawingRound0();
    const [ana, bia, caio] = players;
    const code = (ack: { ok: boolean; error?: { code: string } }) => ack.error?.code;

    expect(code(await ready(ana, 0))).toBe('INVALID_STATE');
    expect(code(await done(ana, 1))).toBe('INVALID_STATE');
    expect(await done(ana, 0)).toEqual({ ok: true, data: {} });
    expect(code(await done(ana, 0))).toBe('INVALID_STATE');
    expect(
      code(await ana.client.emitWithAck('panel:autosave', { roundIndex: 0, png: panelPng() })),
    ).toBe('INVALID_STATE');
    await ana.views.waitFor((v) => taskState(v) === 'draw_panel:submitted');

    await done(bia, 0);
    await done(caio, 0);
    await ana.views.waitFor(inPhase('round_reading', 1));
    // R44: the window of round 0 is over; round 1 has not started drawing yet.
    expect(code(await done(caio, 0))).toBe('DEADLINE_PASSED');
    expect(code(await done(caio, 1))).toBe('INVALID_STATE');

    // IMAGE_INVALID: a PNG of the wrong size.
    await Promise.all(players.map((p) => ready(p, 1)));
    await ana.views.waitFor(inPhase('round_drawing', 1));
    expect(
      code(
        await ana.client.emitWithAck('panel:submit', {
          roundIndex: 1,
          reason: 'done',
          png: new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toBe('IMAGE_INVALID');
  });

  it('R39, R48: my-draft devolve só o rascunho do próprio jogador na rodada atual; 204 sem rascunho', async () => {
    await start();
    const { code, players } = await drawingRound0();
    const [ana, bia, caio] = players;
    const draftOf = (player: Player) => get(`/api/rooms/${code}/my-draft`, player.token);

    const empty = await draftOf(ana);
    expect(empty.status).toBe(204);
    expect(empty.headers.get('cache-control')).toBe('private, no-store');

    expect(
      await ana.client.emitWithAck('panel:autosave', { roundIndex: 0, png: panelPng(7) }),
    ).toEqual({ ok: true, data: {} });
    // Rate limit (arquitetura §7): one autosave every 2 s.
    expect(
      await ana.client.emitWithAck('panel:autosave', { roundIndex: 0, png: panelPng(8) }),
    ).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    await bia.client.emitWithAck('panel:autosave', { roundIndex: 0, png: panelPng(9) });

    const own = await draftOf(ana);
    expect(own.status).toBe(200);
    expect(own.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await own.arrayBuffer())).toEqual(panelPng(7));
    expect(new Uint8Array(await (await draftOf(bia)).arrayBuffer())).toEqual(panelPng(9));
    expect((await draftOf(caio)).status).toBe(204);

    // R48: a reconnection sees `hasDraft`.
    ana.client.disconnect();
    const back = await connectClient(server.url, ana.token);
    clients.push(back);
    const backViews = new ViewRecorder(back);
    await back.emitWithAck('room:join', { roomCode: code, profile: ana.profile });
    expect(taskOf(await backViews.waitFor(inPhase('round_drawing', 0)))).toMatchObject({
      hasDraft: true,
    });

    const stranger = await newPlayer('Zé');
    expect((await draftOf(stranger)).status).toBe(403);
    expect((await get('/api/rooms/ZZZZZZ/my-draft', ana.token)).status).toBe(404);
    expect((await fetch(`${server.url}/api/rooms/${code}/my-draft`)).status).toBe(401);

    // The drafts of a round are dropped when it ends.
    await server.scheduler.advanceBy(DRAWING_MS);
    await server.scheduler.advanceBy(timing.roundClosingMs);
    await bia.views.waitFor(inPhase('round_reading', 1));
    await Promise.all(
      [back, bia.client, caio.client].map((c) => c.emitWithAck('round:ready', { roundIndex: 1 })),
    );
    await bia.views.waitFor(inPhase('round_drawing', 1));
    expect((await draftOf(bia)).status).toBe(204);
  });

  it('R59: quadro de outra história, espectador e ID desconhecido não são acessíveis', async () => {
    await start();
    const { code, players } = await drawingRound0();
    for (const player of players) {
      await done(player, 0);
    }
    const [ana, bia] = players;
    await ana.views.waitFor(inPhase('round_reading', 1));
    await bia.views.waitFor(inPhase('round_reading', 1));
    const [biaPanel] = previousPanelIds(bia);
    const [anaPanel] = previousPanelIds(ana);
    expect(biaPanel).not.toBe(anaPanel);

    expect((await get(`/api/panels/${String(biaPanel)}`, ana.token)).status).toBe(403);
    expect((await get('/api/panels/nao-existe', ana.token)).status).toBe(404);
    expect((await fetch(`${server.url}/api/panels/${String(anaPanel)}`)).status).toBe(401);

    const davi = await newPlayer('Davi');
    await davi.client.emitWithAck('room:join', { roomCode: code, profile: davi.profile });
    expect((await get(`/api/panels/${String(anaPanel)}`, davi.token)).status).toBe(403);
  });

  it('R57: falha ao persistir a rodada → nova tentativa → partida abortada com aviso', async () => {
    await start();
    const saveRoundPanels = vi
      .spyOn(repository, 'saveRoundPanels')
      .mockRejectedValue(new Error('banco fora do ar'));
    const deleteMatch = vi.spyOn(repository, 'deleteMatch');
    const { players } = await drawingRound0();
    const [ana, bia, caio] = players;
    const aborted = nextAborted(bia.client);

    await done(ana, 0);
    await done(bia, 0);
    await done(caio, 0);

    expect(await aborted).toEqual({ reason: 'persistence_failed' });
    await bia.views.waitFor(inLobby);
    expect(saveRoundPanels).toHaveBeenCalledTimes(2);
    expect(deleteMatch).toHaveBeenCalledTimes(1);
  });

  it('R57: abortar pelo anfitrião avisa todos com o motivo', async () => {
    await start();
    const { players } = await drawingRound0();
    const [ana, , caio] = players;
    const aborted = nextAborted(caio.client);

    expect(await ana.client.emitWithAck('match:abort', {})).toEqual({ ok: true, data: {} });
    expect(await aborted).toEqual({ reason: 'host' });
    await caio.views.waitFor(inLobby);
  });
});
