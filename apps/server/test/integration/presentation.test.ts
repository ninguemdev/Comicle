import { defaultAvatar, type PlayerProfile, type PlayerView } from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import type { NewMatch, NewPanel } from '../../src/modules/stories/story-repository';
import { fastGameTiming } from '../../src/modules/timing/game-timing';
import { panelPng } from '../support/panel-png';
import { ViewRecorder } from '../support/room-events';
import {
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

const inPhase = (phase: string) => (view: PlayerView) => view.match?.phase === phase;
const inLobby = (view: PlayerView) => view.room.status === 'lobby' && view.match === null;

/** `story:step` of the presentation, e.g. `1:panel(0)`. */
function stepOf(view: PlayerView | undefined): string {
  const presentation = view?.match?.presentation;
  if (!presentation) {
    return 'none';
  }
  if (presentation.status === 'finished') {
    return 'finished';
  }
  const { step } = presentation;
  const label = step.kind === 'panel' ? `panel(${String(step.position)})` : step.kind;
  return `${String(presentation.storyIndex)}:${label}`;
}

describe('apresentação (integração)', () => {
  let server: TestServer;
  let repository: InMemoryStoryRepository;
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

  async function join(code: string, nickname: string): Promise<Player> {
    const player = await newPlayer(nickname);
    const ack = await player.client.emitWithAck('room:join', {
      roomCode: code,
      profile: player.profile,
    });
    expect(ack.ok).toBe(true);
    await player.views.waitFor(() => true);
    return player;
  }

  /**
   * Ana (host), Bia and Caio play three rounds; Davi joins during the themes, as a spectator.
   * Returns everyone in the presentation and the panel IDs by story and position.
   */
  async function presenting() {
    repository = new InMemoryStoryRepository();
    const createMatch = vi.spyOn(repository, 'createMatch');
    const saveRoundPanels = vi.spyOn(repository, 'saveRoundPanels');
    server = await startTestServer({ storyRepository: repository, timing: fastGameTiming });

    const ana = await newPlayer('Ana');
    const created = await ana.client.emitWithAck('room:create', { profile: ana.profile });
    if (!created.ok) throw new Error(created.error.code);
    const code = created.data.roomCode;
    await ana.views.waitFor(() => true);
    const players = [ana, await join(code, 'Bia'), await join(code, 'Caio')];

    expect((await ana.client.emitWithAck('match:start', {})).ok).toBe(true);
    const davi = await join(code, 'Davi');
    for (const player of players) {
      await player.views.waitFor(inPhase('theme_writing'));
      const text = `Tema de ${player.profile.nickname}`;
      expect((await player.client.emitWithAck('theme:submit', { text })).ok).toBe(true);
    }
    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      for (const player of players) {
        await player.views.waitFor(
          (v) =>
            v.match?.roundIndex === roundIndex &&
            (v.match.phase === 'round_drawing' || v.match.phase === 'round_reading'),
        );
        if (player.views.latest?.match?.phase === 'round_reading') {
          await player.client.emitWithAck('round:ready', { roundIndex });
        }
      }
      for (const player of players) {
        await player.views.waitFor(
          (v) => v.match?.phase === 'round_drawing' && v.match.roundIndex === roundIndex,
        );
        const ack = await player.client.emitWithAck('panel:submit', {
          roundIndex,
          reason: 'done',
          png: panelPng(roundIndex + 1),
        });
        expect(ack.ok).toBe(true);
      }
    }
    const everyone = [...players, davi];
    for (const player of everyone) {
      await player.views.waitFor(inPhase('presentation'));
    }

    const record: NewMatch | undefined = createMatch.mock.calls[0]?.[0];
    const panels: NewPanel[] = saveRoundPanels.mock.calls.flatMap((call) => call[1]);
    /** `panelIds[story][position]`, stories in presentation order (R50). */
    const panelIds = (record?.stories ?? []).map((story) =>
      panels
        .filter((panel) => panel.storyId === story.id)
        .sort((a, b) => a.position - b.position)
        .map((panel) => panel.id),
    );
    const [, bia, caio] = players;
    if (!bia || !caio) throw new Error('jogadores');
    return { ana, bia, caio, davi, everyone, panelIds, repository };
  }

  function navigate(player: Player, action: 'next' | 'prev' | 'showFull' | 'nextStory') {
    return player.client.emitWithAck('presentation:navigate', { action });
  }

  async function imageStatus(player: Player, panelId: string | undefined): Promise<number> {
    const response = await fetch(`${server.url}/api/panels/${String(panelId)}`, {
      headers: { authorization: `Bearer ${player.token}` },
    });
    await response.arrayBuffer();
    return response.status;
  }

  async function statusesFor(everyone: Player[], panelId: string | undefined) {
    return Promise.all(everyone.map((player) => imageStatus(player, panelId)));
  }

  it('R52, R54: todos recebem a mesma etapa; só imagens reveladas saem, nem por ID adivinhado', async () => {
    const { ana, davi, everyone, panelIds } = await presenting();
    const at = (story: number, position: number) => panelIds[story]?.[position];

    expect(davi.views.latest?.me.role).toBe('spectator');
    for (const player of everyone) {
      expect(stepOf(player.views.latest)).toBe('0:theme');
      expect(player.views.latest?.match?.task).toEqual({ kind: 'watch' });
    }
    // R54: the next panel is not revealed yet.
    expect(await statusesFor(everyone, at(0, 0))).toEqual([403, 403, 403, 403]);

    expect(await navigate(ana, 'next')).toEqual({ ok: true, data: {} });
    const views = await Promise.all(
      everyone.map((p) => p.views.waitFor((v) => stepOf(v) === '0:panel(0)')),
    );
    expect(new Set(views.map((v) => JSON.stringify(v.match?.presentation))).size).toBe(1);
    expect(views[0]?.match?.presentation?.story.revealedPanels.map((p) => p.panelId)).toEqual([
      at(0, 0),
    ]);
    expect(await statusesFor(everyone, at(0, 0))).toEqual([200, 200, 200, 200]);
    expect(await statusesFor(everyone, at(0, 1))).toEqual([403, 403, 403, 403]);

    // R53: nextStory reveals the whole previous story.
    expect(await navigate(ana, 'nextStory')).toEqual({ ok: true, data: {} });
    await Promise.all(everyone.map((p) => p.views.waitFor((v) => stepOf(v) === '1:theme')));
    for (const position of [0, 1, 2]) {
      expect(await statusesFor(everyone, at(0, position))).toEqual([200, 200, 200, 200]);
    }
    // R54: a guessed ID of a story not reached yet is still refused.
    expect(await statusesFor(everyone, at(1, 0))).toEqual([403, 403, 403, 403]);
    expect(await statusesFor(everyone, at(2, 2))).toEqual([403, 403, 403, 403]);
    const json = JSON.stringify(davi.views.latest);
    expect(json).not.toContain(String(at(1, 0)));
    // Seats are shuffled (R23): only the themes of the two stories reached show up.
    const themes = ['Ana', 'Bia', 'Caio'].filter((name) => json.includes(`Tema de ${name}`));
    expect(themes).toHaveLength(2);
  });

  it('R52: quem não é anfitrião não navega nem encerra (NOT_HOST)', async () => {
    const { bia, davi } = await presenting();

    for (const player of [bia, davi]) {
      expect(await navigate(player, 'next')).toMatchObject({
        ok: false,
        error: { code: 'NOT_HOST' },
      });
      expect(await player.client.emitWithAck('presentation:end', {})).toMatchObject({
        ok: false,
        error: { code: 'NOT_HOST' },
      });
    }
    expect(stepOf(bia.views.latest)).toBe('0:theme');
  });

  it('R52: goToStory além de maxStoryReached → INVALID_STATE', async () => {
    const { ana } = await presenting();

    const ack = await ana.client.emitWithAck('presentation:navigate', {
      action: 'goToStory',
      storyIndex: 1,
    });
    expect(ack).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
  });

  it('R56: presentation:end leva todos ao lobby, espectadores viram membros e a partida fica finished', async () => {
    const { ana, davi, everyone, panelIds, repository } = await presenting();
    const setMatchStatus = vi.spyOn(repository, 'setMatchStatus');
    const matchId = ana.views.latest?.match?.matchId;
    await navigate(ana, 'showFull');
    await ana.views.waitFor((v) => stepOf(v) === '0:full');

    expect(await ana.client.emitWithAck('presentation:end', {})).toEqual({ ok: true, data: {} });

    for (const player of everyone) {
      const lobby = await player.views.waitFor(inLobby);
      expect(lobby.room.members.map((m) => m.role)).toEqual([
        'member',
        'member',
        'member',
        'member',
      ]);
    }
    expect(davi.views.latest?.me.role).toBe('member');
    expect(setMatchStatus).toHaveBeenCalledWith(matchId, 'finished');
    // Out of the presentation no panel is served any more (R59).
    expect(await imageStatus(ana, panelIds[0]?.[0])).toBe(404);
    expect(await navigate(ana, 'next')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });
  });
});
