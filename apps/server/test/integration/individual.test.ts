import { defaultAvatar, type PlayerProfile, type PlayerView } from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import type { NewMatch, NewPanel } from '../../src/modules/stories/story-repository';
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

// A whole individual match over the socket (R62–R67): rounds without reading, several panels per
// player, the story's drafts after a reconnection and every version persisted.

interface Player {
  client: TestClient;
  views: ViewRecorder;
  token: string;
  profile: PlayerProfile;
}

const timing = fastGameTiming;
const PANELS = 2;
const AUTOSAVE_GAP_MS = 2000;
const SETTINGS = {
  mode: 'individual',
  panelCount: { kind: 'per_player' },
  drawingSeconds: 90,
  showPreviousPanels: true,
  authorDrawsLast: true,
  individual: { panelsPerStory: PANELS, storySeconds: 120 },
} as const;

const inPhase = (phase: string, roundIndex?: number) => (view: PlayerView) =>
  view.match?.phase === phase && (roundIndex === undefined || view.match.roundIndex === roundIndex);

describe('modo individual (integração)', () => {
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

  /** Ana (host), Bia and Caio, already drawing round 0 of an individual match. */
  async function drawingRound0(): Promise<{ code: string; players: [Player, Player, Player] }> {
    const ana = await newPlayer('Ana');
    const created = await ana.client.emitWithAck('room:create', { profile: ana.profile });
    if (!created.ok) throw new Error(created.error.code);
    const code = created.data.roomCode;
    const bia = await newPlayer('Bia');
    const caio = await newPlayer('Caio');
    for (const player of [bia, caio]) {
      expect(
        (await player.client.emitWithAck('room:join', { roomCode: code, profile: player.profile }))
          .ok,
      ).toBe(true);
    }
    expect((await ana.client.emitWithAck('room:updateSettings', { settings: SETTINGS })).ok).toBe(
      true,
    );
    expect((await ana.client.emitWithAck('match:start', {})).ok).toBe(true);
    const players: [Player, Player, Player] = [ana, bia, caio];
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
    return { code, players };
  }

  function draftOf(code: string, player: Player, panelIndex: number): Promise<Response> {
    return fetch(`${server.url}/api/rooms/${code}/my-draft?panelIndex=${String(panelIndex)}`, {
      headers: { authorization: `Bearer ${player.token}` },
    });
  }

  async function handInStory(player: Player, roundIndex: number): Promise<void> {
    for (let panelIndex = 0; panelIndex < PANELS; panelIndex++) {
      const ack = await player.client.emitWithAck('panel:submit', {
        roundIndex,
        panelIndex,
        reason: 'done',
        png: panelPng(10 * roundIndex + panelIndex + 1),
      });
      expect(ack).toEqual({ ok: true, data: {} });
    }
  }

  it('R62–R66: 3 jogadores, 2 rodadas sem leitura, 6 versões persistidas com 2 quadros cada', async () => {
    await start();
    const createMatch = vi.spyOn(repository, 'createMatch');
    const saveRoundPanels = vi.spyOn(repository, 'saveRoundPanels');
    const { players } = await drawingRound0();
    const [ana] = players;

    expect(ana.views.latest?.match?.totalRounds).toBe(2);
    expect(ana.views.latest?.match?.task).toMatchObject({
      kind: 'draw_panel',
      status: 'drawing',
      panelPosition: 0,
      panelCount: PANELS,
      draftPanels: [],
      previousPanels: [],
    });

    for (const roundIndex of [0, 1]) {
      for (const player of players) {
        await player.views.waitFor(inPhase('round_drawing', roundIndex));
      }
      await handInStory(ana, roundIndex);
      // R66: Ana is done once every panel is in; the others are still drawing.
      expect(ana.views.latest?.match?.task).toMatchObject({ status: 'submitted' });
      await handInStory(players[1], roundIndex);
      await handInStory(players[2], roundIndex);
    }
    await ana.views.waitFor(inPhase('presentation'));

    const record: NewMatch | undefined = createMatch.mock.calls[0]?.[0];
    expect(record?.themes).toHaveLength(3);
    expect(record?.stories).toHaveLength(6);
    const panels: NewPanel[] = saveRoundPanels.mock.calls.flatMap(([, saved]) => saved);
    expect(panels).toHaveLength(6 * PANELS);
    expect(panels.every((panel) => panel.status === 'complete')).toBe(true);

    const themeOf = new Map(record?.stories.map((story) => [story.id, story.themeId]));
    const authorOf = new Map(record?.themes.map((theme) => [theme.id, theme.authorPlayerId]));
    for (const story of record?.stories ?? []) {
      const own = panels.filter((panel) => panel.storyId === story.id);
      expect(own.map((panel) => panel.position).sort()).toEqual([0, 1]);
      expect(new Set(own.map((panel) => panel.artistPlayerId)).size).toBe(1);
      // R62: never the author of the theme.
      expect(own[0]?.artistPlayerId).not.toBe(authorOf.get(themeOf.get(story.id) ?? ''));
    }
    expect(ana.views.latest?.match?.presentation?.storyCount).toBe(6);
  });

  it('R48, R66, R67: rascunho por quadro; quem volta recupera todos e não depois de entregar', async () => {
    await start();
    const { code, players } = await drawingRound0();
    const [ana] = players;

    for (const panelIndex of [0, 1]) {
      // One autosave every 2 s per connection (arquitetura §7), whatever the panel.
      await server.scheduler.advanceBy(AUTOSAVE_GAP_MS);
      expect(
        await ana.client.emitWithAck('panel:autosave', {
          roundIndex: 0,
          panelIndex,
          png: panelPng(panelIndex + 7),
        }),
      ).toEqual({ ok: true, data: {} });
    }
    await server.scheduler.advanceBy(AUTOSAVE_GAP_MS);
    expect(
      await ana.client.emitWithAck('panel:autosave', {
        roundIndex: 0,
        panelIndex: PANELS,
        png: panelPng(9),
      }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } });

    const second = await draftOf(code, ana, 1);
    expect(second.status).toBe(200);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(panelPng(8));
    expect((await draftOf(code, players[1], 0)).status).toBe(204);

    ana.client.disconnect();
    const back = await connectClient(server.url, ana.token);
    clients.push(back);
    const backViews = new ViewRecorder(back);
    await back.emitWithAck('room:join', { roomCode: code, profile: ana.profile });
    const view = await backViews.waitFor(inPhase('round_drawing', 0));
    expect(view.match?.task).toMatchObject({ status: 'drawing', draftPanels: [0, 1] });

    expect(
      (
        await back.emitWithAck('panel:submit', {
          roundIndex: 0,
          panelIndex: 0,
          reason: 'done',
          png: panelPng(1),
        })
      ).ok,
    ).toBe(true);
    // R67: a panel handed in is no longer served, the other one still is.
    expect((await draftOf(code, ana, 0)).status).toBe(204);
    expect((await draftOf(code, ana, 1)).status).toBe(200);
  });
});
