import {
  clientEventSchemas,
  defaultAvatar,
  PANEL_MAX_BYTES,
  TEXT_INPUT_MAX_LENGTH,
  type Ack,
  type ClientEventName,
  type PlayerProfile,
  type PlayerView,
} from '@comicle/shared';
import fc from 'fast-check';
import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../../src/config/env';
import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import { fastGameTiming } from '../../src/modules/timing/game-timing';
import { panelPng } from '../support/panel-png';
import {
  countAttachments,
  payloadLike,
  SOCKET_IO_MAX_ATTACHMENTS,
} from '../support/payload-arbitrary';
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
const EVENTS = Object.keys(clientEventSchemas) as ClientEventName[];
/** Room enough for thousands of events: the limits have tests of their own. */
const NO_SOCKET_LIMITS = {
  global: { capacity: 1_000_000, refillPerSecond: 1_000_000 },
  perEvent: {},
  failuresPerIp: {},
};

const ACK_WAIT_MS = 2000;

/** Any event with any payload, as a hostile client could send it; no ack in time is an error. */
function emitRaw(client: TestClient, event: string, payload: unknown): Promise<Ack<unknown>> {
  const untyped: Socket = client;
  return untyped.timeout(ACK_WAIT_MS).emitWithAck(event, payload);
}

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

  /** Ana (host) and Bia in a room; with `drawing`, already drawing round 0. */
  async function room({ drawing = false } = {}): Promise<[Player, Player]> {
    const ana = await newPlayer('Ana');
    const bia = await newPlayer('Bia');
    const created = await ana.client.emitWithAck('room:create', { profile: ana.profile });
    if (!created.ok) throw new Error(created.error.code);
    await bia.client.emitWithAck('room:join', {
      roomCode: created.data.roomCode,
      profile: bia.profile,
    });
    await bia.views.waitFor(() => true);
    if (drawing) {
      await ana.client.emitWithAck('match:start', {});
      for (const player of [ana, bia]) {
        await player.views.waitFor(inPhase('theme_writing'));
        await player.client.emitWithAck('theme:submit', {
          text: `Tema de ${player.profile.nickname}`,
        });
      }
      await bia.views.waitFor(inPhase('round_drawing'));
    }
    return [ana, bia];
  }

  describe('robustez', () => {
    const situations = {
      'fora de sala': async () => (await newPlayer('Zé')).client,
      'anfitrião no lobby': async () => (await room())[0].client,
      'participante desenhando': async () => (await room({ drawing: true }))[1].client,
    };

    it.each(Object.keys(situations))(
      'payload aleatório em qualquer evento (%s) nunca gera INTERNAL nem derruba o servidor',
      async (situation) => {
        await start({ socketRateLimits: NO_SOCKET_LIMITS });
        const client = await situations[situation as keyof typeof situations]();

        await fc.assert(
          fc.asyncProperty(fc.constantFrom(...EVENTS), payloadLike, async (event, payload) => {
            // Above the parser's limit the connection is closed before any handler: own test.
            fc.pre(countAttachments(payload) <= SOCKET_IO_MAX_ATTACHMENTS);
            const ack = await emitRaw(client, event, payload);
            expect(ack.ok || ack.error.code).not.toBe('INTERNAL');
            expect(client.connected).toBe(true);
          }),
          { numRuns: 400 },
        );

        const fresh = await newPlayer('Depois');
        expect(await fresh.client.emitWithAck('time:sync', { clientSentAt: 1 })).toMatchObject({
          ok: true,
        });
      },
    );
  });

  describe('autorização do anfitrião', () => {
    type Actor = 'anfitrião' | 'membro' | 'espectador' | 'não membro';
    /** `ok` or the error code each actor gets. */
    type Expected = Partial<Record<Actor, 'ok' | 'NOT_HOST' | 'NOT_IN_ROOM' | 'INVALID_STATE'>>;
    type HostAction = [ClientEventName, (players: Record<string, Player>) => unknown, Expected];

    const settings = {
      mode: 'collaborative',
      panelCount: { kind: 'fixed', value: 5 },
      drawingSeconds: 60,
    };
    const kickBia = (players: Record<string, Player>) => ({
      playerId: players.bia?.views.latest?.me.playerId ?? '',
    });
    const outsiders = {
      membro: 'NOT_HOST',
      espectador: 'NOT_HOST',
      'não membro': 'NOT_IN_ROOM',
    } as const;

    /** Every action only the host may take (R11, R12, R22, R52, R56, R57). */
    const LOBBY: HostAction[] = [
      ['room:kick', kickBia, { ...outsiders, anfitrião: 'ok' }],
      ['room:updateSettings', () => ({ settings }), { ...outsiders, anfitrião: 'ok' }],
      ['match:abort', () => ({}), { ...outsiders, anfitrião: 'INVALID_STATE' }],
      [
        'presentation:navigate',
        () => ({ action: 'next' }),
        { ...outsiders, anfitrião: 'INVALID_STATE' },
      ],
      ['presentation:end', () => ({}), { ...outsiders, anfitrião: 'INVALID_STATE' }],
      ['match:start', () => ({}), { ...outsiders }],
    ];
    const PRESENTATION: HostAction[] = [
      ['room:kick', kickBia, { ...outsiders, anfitrião: 'INVALID_STATE' }],
      ['room:updateSettings', () => ({ settings }), { ...outsiders, anfitrião: 'INVALID_STATE' }],
      ['match:start', () => ({}), { ...outsiders, anfitrião: 'INVALID_STATE' }],
      ['match:abort', () => ({}), { ...outsiders }],
      ['presentation:end', () => ({}), { ...outsiders }],
      ['presentation:navigate', () => ({ action: 'next' }), { ...outsiders, anfitrião: 'ok' }],
    ];

    async function checkMatrix(
      actions: HostAction[],
      players: Record<Actor, Player | undefined>,
      named: Record<string, Player>,
    ) {
      // Refusals first: the host's own actions change the room.
      const order: Actor[] = ['não membro', 'espectador', 'membro', 'anfitrião'];
      for (const actor of order) {
        const player = players[actor];
        if (!player) continue;
        for (const [event, payload, expected] of actions) {
          const outcome = expected[actor];
          if (outcome === undefined) continue;
          const ack = await emitRaw(player.client, event, payload(named));
          const label = `${actor} → ${event}`;
          if (outcome === 'ok') {
            expect(ack.ok, label).toBe(true);
          } else {
            expect(ack, label).toMatchObject({ ok: false, error: { code: outcome } });
          }
        }
      }
    }

    it('no lobby, cada ação exclusiva × cada papel', async () => {
      await start();
      const [ana, bia] = await room();
      const eve = await newPlayer('Eve');
      const before = ana.views.latest?.room.settings;

      await checkMatrix(
        LOBBY,
        { anfitrião: undefined, membro: bia, espectador: undefined, 'não membro': eve },
        { bia },
      );
      // Nothing the others tried changed the room.
      expect(ana.views.latest?.room.settings).toEqual(before);
      expect(ana.views.latest?.room.members).toHaveLength(2);

      await checkMatrix(
        LOBBY,
        { anfitrião: ana, membro: undefined, espectador: undefined, 'não membro': undefined },
        { bia },
      );
      expect(ana.views.latest?.room.members).toHaveLength(1);
    });

    it('na apresentação, cada ação exclusiva × cada papel', async () => {
      await start();
      const [ana, bia] = await room();
      const caio = await newPlayer('Caio');
      const code = ana.views.latest?.room.code ?? '';
      await caio.client.emitWithAck('room:join', { roomCode: code, profile: caio.profile });
      await ana.client.emitWithAck('match:start', {});
      const davi = await newPlayer('Davi');
      await davi.client.emitWithAck('room:join', { roomCode: code, profile: davi.profile });
      const eve = await newPlayer('Eve');
      const seated = [ana, bia, caio];
      for (const player of seated) {
        await player.views.waitFor(inPhase('theme_writing'));
        await player.client.emitWithAck('theme:submit', {
          text: `Tema de ${player.profile.nickname}`,
        });
      }
      for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
        for (const player of seated) {
          await player.views.waitFor(
            (v) => v.match?.roundIndex === roundIndex && v.match.phase !== 'theme_writing',
          );
          if (player.views.latest?.match?.phase === 'round_reading') {
            await player.client.emitWithAck('round:ready', { roundIndex });
          }
        }
        for (const player of seated) {
          await player.views.waitFor(
            (v) => v.match?.phase === 'round_drawing' && v.match.roundIndex === roundIndex,
          );
          await player.client.emitWithAck('panel:submit', {
            roundIndex,
            reason: 'done',
            png: panelPng(roundIndex + 1),
          });
        }
      }
      await davi.views.waitFor(inPhase('presentation'));
      expect(davi.views.latest?.me.role).toBe('spectator');

      await checkMatrix(
        PRESENTATION,
        { anfitrião: undefined, membro: bia, espectador: davi, 'não membro': eve },
        { bia },
      );
      // The presentation did not move and the match is still on.
      expect(ana.views.latest?.match?.presentation).toMatchObject({
        storyIndex: 0,
        step: { kind: 'theme' },
      });

      await checkMatrix(
        PRESENTATION,
        { anfitrião: ana, membro: undefined, espectador: undefined, 'não membro': undefined },
        { bia },
      );
      const revealed = await bia.views.waitFor((v) => v.match?.presentation?.step.kind === 'panel');
      // R59: the revealed panel goes to members, spectator included, never to an outsider.
      const panelId = revealed.match?.presentation?.story.revealedPanels[0]?.panelId ?? '';
      const image = (player: Player) =>
        server.http.inject({
          method: 'GET',
          url: `/api/panels/${panelId}`,
          headers: { authorization: `Bearer ${player.token}` },
        });
      expect((await image(bia)).statusCode).toBe(200);
      expect((await image(davi)).statusCode).toBe(200);
      expect((await image(eve)).statusCode).toBe(403);
    });
  });

  describe('limites de taxa', () => {
    it.each([
      ['POST /api/guest-sessions', 'POST', '/api/guest-sessions', 10],
      ['GET /api/rooms/:code (varredura de códigos)', 'GET', '/api/rooms/K7PQ2M', 30],
    ] as const)(
      '%s: a requisição além do limite por minuto → 429 RATE_LIMITED',
      async (_name, method, url, max) => {
        await start();
        for (let i = 0; i < max; i++) {
          expect((await server.http.inject({ method, url })).statusCode).not.toBe(429);
        }

        const refused = await server.http.inject({ method, url });

        expect(refused.statusCode).toBe(429);
        expect(refused.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } });
      },
    );

    it('socket: 20 eventos por segundo por conexão; o 21º → RATE_LIMITED', async () => {
      await start();
      const player = await newPlayer('Ana');
      const acks = [];
      for (let i = 0; i < 21; i++) {
        acks.push(await player.client.emitWithAck('time:sync', { clientSentAt: i }));
      }

      expect(acks.slice(0, 20).every((ack) => ack.ok)).toBe(true);
      expect(acks[20]).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    });

    it('socket: um panel:autosave a cada 2 s', async () => {
      await start();
      const [, bia] = await room({ drawing: true });
      const autosave = () =>
        bia.client.emitWithAck('panel:autosave', { roundIndex: 0, png: panelPng(1) });

      expect((await autosave()).ok).toBe(true);
      expect(await autosave()).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
      server.clock.advance(2000);
      expect((await autosave()).ok).toBe(true);
    });

    it('socket: 10 room:join com falha por minuto por IP, somando conexões; depois nem o código certo entra', async () => {
      await start();
      const [ana] = await room();
      const code = ana.views.latest?.room.code ?? '';
      const first = await newPlayer('Varredor');
      const second = await newPlayer('Varredor 2');
      const guesses = ['AAAAAA', 'BBBBBB', 'CCCCCC', 'DDDDDD', 'EEEEEE'];
      for (const scanner of [first, second]) {
        for (const guess of guesses) {
          expect(
            await scanner.client.emitWithAck('room:join', {
              roomCode: guess,
              profile: scanner.profile,
            }),
          ).toMatchObject({ ok: false, error: { code: 'ROOM_NOT_FOUND' } });
        }
      }

      const blocked = await second.client.emitWithAck('room:join', {
        roomCode: code,
        profile: second.profile,
      });
      expect(blocked).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });

      // One token back every 6 s.
      server.clock.advance(6000);
      expect(
        (await second.client.emitWithAck('room:join', { roomCode: code, profile: second.profile }))
          .ok,
      ).toBe(true);
    });
  });

  describe('robustez HTTP', () => {
    const segment = fc.oneof(
      fc.string({ unit: 'binary', maxLength: 80 }),
      fc.constantFrom(
        '',
        '..',
        '%00',
        '%E0%A4%A',
        'K7PQ2M',
        '00000000-0000-0000-0000-000000000000',
      ),
    );
    const authorization = fc.option(
      fc.oneof(
        fc.string({ maxLength: 80 }).map((value) => `Bearer ${value}`),
        fc.string({ unit: 'grapheme-ascii', maxLength: 80 }),
      ),
      { nil: undefined },
    );
    const route = fc.constantFrom(
      (x: string) => ['GET', `/api/rooms/${x}`] as const,
      (x: string) => ['GET', `/api/rooms/${x}/my-draft`] as const,
      (x: string) => ['GET', `/api/panels/${x}`] as const,
      () => ['GET', '/api/guest-sessions/me'] as const,
      () => ['POST', '/api/guest-sessions'] as const,
    );

    it('rota, parâmetro, autorização e corpo aleatórios nunca respondem 500', async () => {
      await start();
      await fc.assert(
        fc.asyncProperty(
          route,
          segment,
          authorization,
          fc.string({ maxLength: 200 }),
          async (make, value, auth, body) => {
            const [method, url] = make(encodeURIComponent(value));
            const response = await server.http.inject({
              method,
              url,
              headers: {
                ...(auth === undefined ? {} : { authorization: auth }),
                'content-type': 'application/json',
              },
              ...(method === 'POST' ? { payload: body } : {}),
            });
            expect(response.statusCode, `${method} ${url}`).toBeLessThan(500);
            if (response.statusCode >= 400) {
              expect(response.json<{ error: { code: string } }>().error.code).not.toBe('INTERNAL');
            }
          },
        ),
        { numRuns: 300 },
      );
    });
  });

  describe('limites de tamanho', () => {
    it('mais anexos binários que o parser aceita: só a conexão de quem mandou cai', async () => {
      await start();
      const hostile = await newPlayer('Hostil');
      const closed = new Promise<string>((resolve) => {
        hostile.client.once('disconnect', resolve);
      });
      const payload = {
        png: Array.from({ length: SOCKET_IO_MAX_ATTACHMENTS + 1 }, () => panelPng(1)),
      };

      await emitRaw(hostile.client, 'panel:autosave', payload).catch(() => undefined);

      expect(await closed).toBe('transport close');
      const other = await newPlayer('Outra');
      expect((await other.client.emitWithAck('time:sync', { clientSentAt: 1 })).ok).toBe(true);
    });

    it('mensagem acima de maxHttpBufferSize (3 MiB): a conexão cai e o servidor segue', async () => {
      await start();
      const hostile = await newPlayer('Hostil');
      const closed = new Promise<string>((resolve) => {
        hostile.client.once('disconnect', resolve);
      });

      await emitRaw(hostile.client, 'panel:autosave', {
        roundIndex: 0,
        png: new Uint8Array(3 * 1024 * 1024 + 1),
      }).catch(() => undefined);

      expect(await closed).toBe('transport close');
      const other = await newPlayer('Outra');
      expect((await other.client.emitWithAck('time:sync', { clientSentAt: 1 })).ok).toBe(true);
    });

    it('R1, R27: texto acima do limite bruto → INVALID_PAYLOAD, nunca INTERNAL', async () => {
      await start();
      const player = await newPlayer('Ana');
      const huge = 'a'.repeat(TEXT_INPUT_MAX_LENGTH + 1);

      for (const [event, payload] of [
        ['room:create', { profile: { nickname: huge, avatar: defaultAvatar() } }],
        ['room:join', { roomCode: huge, profile: player.profile }],
        ['theme:draft', { text: huge }],
        ['room:kick', { playerId: huge }],
      ] as const) {
        expect(await emitRaw(player.client, event, payload)).toMatchObject({
          ok: false,
          error: { code: 'INVALID_PAYLOAD' },
        });
      }
    });

    it('imagem acima de PANEL_MAX_BYTES → IMAGE_TOO_LARGE', async () => {
      await start();
      const [, bia] = await room({ drawing: true });

      expect(
        await emitRaw(bia.client, 'panel:autosave', {
          roundIndex: 0,
          png: new Uint8Array(PANEL_MAX_BYTES + 1),
        }),
      ).toMatchObject({ ok: false, error: { code: 'IMAGE_TOO_LARGE' } });
    });
  });

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
