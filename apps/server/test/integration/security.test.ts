import { defaultAvatar, type PlayerProfile, type PlayerView } from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../../src/config/env';
import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import { fastGameTiming } from '../../src/modules/timing/game-timing';
import { panelPng } from '../support/panel-png';
import { ViewRecorder } from '../support/room-events';
import {
  connectClient,
  startTestServer,
  type TestClient,
  type TestServer,
  type TestServerOverrides,
} from '../support/test-server';

// T19: what protects a match, checked end to end (arquitetura §7).

interface Player {
  client: TestClient;
  views: ViewRecorder;
  token: string;
  profile: PlayerProfile;
}

const inPhase = (phase: string) => (view: PlayerView) => view.match?.phase === phase;

describe('segurança (integração)', () => {
  let server: TestServer;
  const clients: TestClient[] = [];

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await server.close();
  });

  async function start(overrides: TestServerOverrides = {}) {
    server = await startTestServer({ timing: fastGameTiming, ...overrides });
  }

  /** A guest made through the HTTP route, like the web client does. */
  async function newPlayer(nickname: string): Promise<Player> {
    const created = await server.http.inject({ method: 'POST', url: '/api/guest-sessions' });
    const { token } = created.json<{ token: string }>();
    const client = await connectClient(server.url, token);
    clients.push(client);
    return {
      client,
      token,
      views: new ViewRecorder(client),
      profile: { nickname, avatar: defaultAvatar() },
    };
  }

  describe('logs', () => {
    it('nenhum log contém token, tema, apelido ou imagem, nem quando o banco falha', async () => {
      const lines: string[] = [];
      const repository = new InMemoryStoryRepository();
      const theme = 'Tema ultrassecreto do teste';
      // Like Drizzle: the failed query carries its parameters in the message.
      vi.spyOn(repository, 'createMatch').mockRejectedValueOnce(
        new Error(`Failed query: insert into "themes" values ($1)\nparams: ${theme},Zé Secreto`),
      );
      vi.spyOn(repository, 'saveRoundPanels').mockRejectedValueOnce(
        new Error(
          `Failed query: insert into "panels"\nparams: ${Buffer.from(panelPng(9)).toString('base64')}`,
        ),
      );
      await start({
        storyRepository: repository,
        config: loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'trace' }),
        logDestination: { write: (line) => lines.push(line) },
      });

      const ana = await newPlayer('Zé Secreto');
      const bia = await newPlayer('Bia Oculta');
      await server.http.inject({
        method: 'GET',
        url: '/api/guest-sessions/me',
        headers: { authorization: `Bearer ${ana.token}` },
      });
      const created = await ana.client.emitWithAck('room:create', { profile: ana.profile });
      if (!created.ok) throw new Error(created.error.code);
      await bia.client.emitWithAck('room:join', {
        roomCode: created.data.roomCode,
        profile: bia.profile,
      });
      await ana.client.emitWithAck('match:start', {});
      for (const player of [ana, bia]) {
        await player.views.waitFor(inPhase('theme_writing'));
        await player.client.emitWithAck('theme:submit', { text: theme });
      }
      for (const player of [ana, bia]) {
        await player.views.waitFor(inPhase('round_drawing'));
        await player.client.emitWithAck('panel:submit', {
          roundIndex: 0,
          reason: 'done',
          png: panelPng(9),
        });
      }
      await ana.views.waitFor(inPhase('round_reading'));

      const logs = lines.join('\n');
      // Both failures were logged (and retried): the test exercised the error path.
      expect(logs).toContain('failed to persist match');
      expect(logs).toContain('failed to persist round');
      for (const secret of [
        ana.token,
        bia.token,
        theme,
        'Zé Secreto',
        'Bia Oculta',
        Buffer.from(panelPng(9)).toString('base64'),
      ]) {
        expect(logs).not.toContain(secret);
      }
    });
  });
});
