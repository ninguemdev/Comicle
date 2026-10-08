import {
  defaultAvatar,
  EMPTY_ROOM_TTL_MS,
  HOST_TRANSFER_GRACE_MS,
  LOBBY_DISCONNECT_REMOVE_MS,
  MAX_PLAYERS,
  ROOM_MAX_AGE_MS,
  roomCodeSchema,
  type PlayerProfile,
  type PlayerView,
} from '@comicle/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryStoryRepository } from '../../src/modules/stories/in-memory-story-repository';
import {
  nextDisconnect,
  nextRoomRemoved,
  nextSessionReplaced,
  ViewRecorder,
  waitForTimer,
} from '../support/room-events';
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

const nicknames = (view: PlayerView) => view.room.members.map((member) => member.nickname);

function playerIdOf(player: Player): string {
  const playerId = player.views.latest?.me.playerId;
  if (playerId === undefined) {
    throw new Error(`${player.profile.nickname} ainda não recebeu room:view`);
  }
  return playerId;
}

function memberOf(view: PlayerView | undefined, nickname: string) {
  return view?.room.members.find((member) => member.nickname === nickname);
}

describe('salas (integração)', () => {
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

  /** Same session on a new connection, like reloading the page. */
  async function reopen(player: Player): Promise<Player> {
    const client = await connectClient(server.url, player.token);
    clients.push(client);
    return { ...player, client, views: new ViewRecorder(client) };
  }

  async function createRoom(nickname = 'Ana'): Promise<{ host: Player; code: string }> {
    const host = await newPlayer(nickname);
    const ack = await host.client.emitWithAck('room:create', { profile: host.profile });
    if (!ack.ok) {
      throw new Error(ack.error.code);
    }
    return { host, code: ack.data.roomCode };
  }

  function join(player: Player, code: string) {
    return player.client.emitWithAck('room:join', { roomCode: code, profile: player.profile });
  }

  async function joinNew(code: string, nickname: string): Promise<Player> {
    const player = await newPlayer(nickname);
    expect(await join(player, code)).toEqual({ ok: true, data: { roomCode: code } });
    return player;
  }

  /** Drops the connection and waits until the server has handled it. */
  async function drop(player: Player): Promise<void> {
    const playerId = playerIdOf(player);
    player.client.disconnect();
    await waitForTimer(() => server.scheduler.pendingKeys(), `:remove:${playerId}`);
  }

  function pendingTimer(suffix: string): boolean {
    return server.scheduler.pendingKeys().some((key) => key.endsWith(suffix));
  }

  it('R8, R6: criar sala devolve um código válido, registra a sala e o criador é o anfitrião', async () => {
    await start();
    const createRoomSpy = vi.spyOn(repository, 'createRoom');

    const { host, code } = await createRoom();

    expect(roomCodeSchema.safeParse(code).success).toBe(true);
    expect(createRoomSpy).toHaveBeenCalledTimes(1);
    expect(createRoomSpy.mock.calls[0]?.[0].code).toBe(code);
    const view = host.views.latest;
    expect(view?.room).toMatchObject({ code, status: 'lobby', hostPlayerId: view?.me.playerId });
    expect(view?.me).toMatchObject({ isHost: true, role: 'member' });
    expect(view?.match).toBeNull();
  });

  it('três clientes entram e todos recebem room:view com os três em ordem de entrada', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const caio = await joinNew(code, 'Caio');

    for (const player of [host, bia, caio]) {
      const view = await player.views.waitFor((current) => current.room.members.length === 3);
      expect(nicknames(view)).toEqual(['Ana', 'Bia', 'Caio']);
      expect(view.room.members.every((member) => member.connected)).toBe(true);
    }
  });

  it('R9: o 13º membro recebe ROOM_FULL; membro existente reconecta mesmo com a sala cheia', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const others: Player[] = [];
    for (let index = 1; index < MAX_PLAYERS; index++) {
      others.push(await joinNew(code, `Jogador ${String(index)}`));
    }
    await host.views.waitFor((view) => view.room.members.length === MAX_PLAYERS);

    const latecomer = await newPlayer('Atrasado');
    expect(await join(latecomer, code)).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });

    const [returning] = others;
    if (!returning) {
      throw new Error('sem jogadores');
    }
    const playerId = playerIdOf(returning);
    await drop(returning);
    const back = await reopen(returning);
    expect(await join(back, code)).toEqual({ ok: true, data: { roomCode: code } });
    expect(back.views.latest?.me.playerId).toBe(playerId);
    expect(back.views.latest?.room.members).toHaveLength(MAX_PLAYERS);
  });

  it('R12: expulsão avisa o expulso, que não consegue voltar; o anfitrião não expulsa a si mesmo', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const caio = await joinNew(code, 'Caio');
    const removed = nextRoomRemoved(bia.client);

    const kick = await host.client.emitWithAck('room:kick', { playerId: playerIdOf(bia) });

    expect(kick).toEqual({ ok: true, data: {} });
    expect(await removed).toEqual({ reason: 'kicked' });
    await host.views.waitFor((view) => nicknames(view).join() === 'Ana,Caio');
    expect(await join(bia, code)).toMatchObject({ ok: false, error: { code: 'KICKED' } });
    const biaAgain = await reopen(bia);
    expect(await join(biaAgain, code)).toMatchObject({ ok: false, error: { code: 'KICKED' } });

    const self = await host.client.emitWithAck('room:kick', { playerId: playerIdOf(host) });
    expect(self).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } });
    const notHost = await caio.client.emitWithAck('room:kick', { playerId: playerIdOf(host) });
    expect(notHost).toMatchObject({ ok: false, error: { code: 'NOT_HOST' } });
  });

  it('R11: só o anfitrião altera as configurações, e todos recebem a mudança', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const settings = {
      mode: 'collaborative',
      panelCount: { kind: 'fixed', value: 6 },
      drawingSeconds: 60,
    } as const;

    const denied = await bia.client.emitWithAck('room:updateSettings', { settings });
    expect(denied).toMatchObject({ ok: false, error: { code: 'NOT_HOST' } });

    const accepted = await host.client.emitWithAck('room:updateSettings', { settings });
    expect(accepted).toEqual({ ok: true, data: {} });
    for (const player of [host, bia]) {
      await player.views.waitFor((view) => view.room.settings.drawingSeconds === 60);
      expect(player.views.latest?.room.settings).toEqual(settings);
    }
  });

  it('R21: modo individual é recusado com INVALID_PAYLOAD', async () => {
    await start();
    const { host } = await createRoom();

    const ack = await host.client.emitWithAck('room:updateSettings', {
      // @ts-expect-error: the v1 schema accepts only the collaborative mode
      settings: { mode: 'individual', panelCount: { kind: 'per_player' }, drawingSeconds: 90 },
    });

    expect(ack).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } });
  });

  it('R14, R15: anfitrião sai → função vai para o membro conectado mais antigo', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const caio = await joinNew(code, 'Caio');
    await drop(bia);

    expect(await host.client.emitWithAck('room:leave', {})).toEqual({ ok: true, data: {} });

    const view = await caio.views.waitFor((current) => current.me.isHost);
    expect(nicknames(view)).toEqual(['Bia', 'Caio']);
    expect(view.room.hostPlayerId).toBe(playerIdOf(caio));
  });

  it('R14: anfitrião desconectado por HOST_TRANSFER_GRACE_MS perde a função e não a recupera ao voltar', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    await drop(host);

    await server.scheduler.advanceBy(HOST_TRANSFER_GRACE_MS);

    await bia.views.waitFor((view) => view.me.isHost);
    const back = await reopen(host);
    expect(await join(back, code)).toEqual({ ok: true, data: { roomCode: code } });
    expect(back.views.latest?.me.isHost).toBe(false);
    expect(back.views.latest?.room.hostPlayerId).toBe(playerIdOf(bia));
  });

  it('R14: anfitrião que volta antes do prazo continua anfitrião', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const hostId = playerIdOf(host);
    await drop(host);
    expect(pendingTimer(':host-transfer')).toBe(true);

    await server.scheduler.advanceBy(HOST_TRANSFER_GRACE_MS - 1);
    const back = await reopen(host);
    await join(back, code);

    expect(pendingTimer(':host-transfer')).toBe(false);
    await server.scheduler.advanceBy(HOST_TRANSFER_GRACE_MS);
    expect(back.views.latest?.me.isHost).toBe(true);
    await bia.views.waitFor((view) => memberOf(view, 'Ana')?.connected === true);
    expect(bia.views.latest?.room.hostPlayerId).toBe(hostId);
  });

  it('R14: sem ninguém conectado, a função fica com o primeiro membro que voltar', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    await drop(host);
    await drop(bia);

    await server.scheduler.advanceBy(HOST_TRANSFER_GRACE_MS);
    const biaBack = await reopen(bia);
    await join(biaBack, code);

    expect(biaBack.views.latest?.me.isHost).toBe(true);
  });

  it('R13: desconectado no lobby aparece desconectado e é removido após o prazo', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    await drop(bia);
    await host.views.waitFor((view) => memberOf(view, 'Bia')?.connected === false);

    await server.scheduler.advanceBy(LOBBY_DISCONNECT_REMOVE_MS);

    await host.views.waitFor((view) => nicknames(view).join() === 'Ana');
    expect(pendingTimer(`:remove:${playerIdOf(bia)}`)).toBe(false);
  });

  it('R13: quem volta antes do prazo mantém o playerId e não é removido', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const playerId = playerIdOf(bia);
    await drop(bia);

    await server.scheduler.advanceBy(LOBBY_DISCONNECT_REMOVE_MS - 1);
    const back = await reopen(bia);
    await join(back, code);

    expect(pendingTimer(`:remove:${playerId}`)).toBe(false);
    await server.scheduler.advanceBy(LOBBY_DISCONNECT_REMOVE_MS);
    expect(back.views.latest?.me.playerId).toBe(playerId);
    const view = await host.views.waitFor(
      (current) => memberOf(current, 'Bia')?.connected === true,
    );
    expect(nicknames(view)).toEqual(['Ana', 'Bia']);
  });

  it('R5: segunda conexão da mesma sessão assume e a primeira recebe session:replaced', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const replaced = nextSessionReplaced(bia.client);
    const closed = nextDisconnect(bia.client);

    const second = await reopen(bia);
    expect(await join(second, code)).toEqual({ ok: true, data: { roomCode: code } });

    await replaced;
    await closed;
    expect(second.views.latest?.me.playerId).toBe(playerIdOf(bia));
    // The old connection dropping must not mark Bia as disconnected.
    await host.client.emitWithAck('player:updateProfile', {
      profile: { nickname: 'Ana B', avatar: defaultAvatar() },
    });
    const view = await host.views.waitFor((current) => memberOf(current, 'Ana B') !== undefined);
    expect(memberOf(view, 'Bia')?.connected).toBe(true);
  });

  it('R16: sala sem ninguém conectado é encerrada no prazo e o conteúdo é apagado', async () => {
    await start();
    const deleteRoomSpy = vi.spyOn(repository, 'deleteRoom');
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    await drop(host);
    await drop(bia);
    expect(pendingTimer(':empty')).toBe(true);

    await server.scheduler.advanceBy(EMPTY_ROOM_TTL_MS);

    expect(deleteRoomSpy).toHaveBeenCalledTimes(1);
    expect(server.scheduler.pendingKeys().filter((key) => key.startsWith('room:'))).toEqual([]);
    const lookup = await server.http.inject({ method: 'GET', url: `/api/rooms/${code}` });
    expect(lookup.statusCode).toBe(404);
  });

  it('R16: alguém voltando cancela o encerramento da sala vazia', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    await drop(host);
    expect(pendingTimer(':empty')).toBe(true);

    const back = await reopen(host);
    await join(back, code);

    expect(pendingTimer(':empty')).toBe(false);
  });

  it('R15, R16: o último membro que sai encerra a sala na hora', async () => {
    await start();
    const deleteRoomSpy = vi.spyOn(repository, 'deleteRoom');
    const { host, code } = await createRoom('Ana');

    expect(await host.client.emitWithAck('room:leave', {})).toEqual({ ok: true, data: {} });

    expect(deleteRoomSpy).toHaveBeenCalledTimes(1);
    const latecomer = await newPlayer('Bia');
    expect(await join(latecomer, code)).toMatchObject({
      ok: false,
      error: { code: 'ROOM_NOT_FOUND' },
    });
  });

  it('R16: sala que atinge ROOM_MAX_AGE_MS é encerrada e quem está nela recebe room:removed', async () => {
    await start();
    const deleteRoomSpy = vi.spyOn(repository, 'deleteRoom');
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const removed = [nextRoomRemoved(host.client), nextRoomRemoved(bia.client)];

    await server.scheduler.advanceBy(ROOM_MAX_AGE_MS);

    expect(await Promise.all(removed)).toEqual([{ reason: 'closed' }, { reason: 'closed' }]);
    expect(deleteRoomSpy).toHaveBeenCalledTimes(1);
    expect(await host.client.emitWithAck('room:leave', {})).toMatchObject({
      ok: false,
      error: { code: 'NOT_IN_ROOM' },
    });
  });

  it('R4: player:updateProfile com avatar inválido → INVALID_PAYLOAD; válido chega a todos', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');

    const invalid = await bia.client.emitWithAck('player:updateProfile', {
      profile: { nickname: 'Bia', avatar: { ...defaultAvatar(), head: 'head-triangle' } },
    });
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } });

    const valid = await bia.client.emitWithAck('player:updateProfile', {
      profile: { nickname: '  Bia   Nova ', avatar: { ...defaultAvatar(), hat: 'hat-cap' } },
    });
    expect(valid).toEqual({ ok: true, data: {} });
    const view = await host.views.waitFor((current) => memberOf(current, 'Bia Nova') !== undefined);
    expect(memberOf(view, 'Bia Nova')?.avatar.hat).toBe('hat-cap');
  });

  it('entrar de novo na mesma sala pelo mesmo socket é idempotente e atualiza o perfil', async () => {
    await start();
    const { code } = await createRoom('Ana');
    const bia = await joinNew(code, 'Bia');
    const playerId = playerIdOf(bia);

    const again = await bia.client.emitWithAck('room:join', {
      roomCode: code,
      profile: { nickname: 'Bia 2', avatar: defaultAvatar() },
    });

    expect(again).toEqual({ ok: true, data: { roomCode: code } });
    const view = await bia.views.waitFor((current) => memberOf(current, 'Bia 2') !== undefined);
    expect(view.me.playerId).toBe(playerId);
    expect(nicknames(view)).toEqual(['Ana', 'Bia 2']);
  });

  it('código inexistente → ROOM_NOT_FOUND; já em uma sala → INVALID_STATE; fora de sala → NOT_IN_ROOM', async () => {
    await start();
    const { host, code } = await createRoom('Ana');
    const other = await createRoom('Bia');

    const lost = await newPlayer('Caio');
    expect(await join(lost, '23456A')).toMatchObject({
      ok: false,
      error: { code: 'ROOM_NOT_FOUND' },
    });
    expect(await lost.client.emitWithAck('room:leave', {})).toMatchObject({
      ok: false,
      error: { code: 'NOT_IN_ROOM' },
    });
    expect(await join(host, other.code)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });
    expect(await host.client.emitWithAck('room:create', { profile: host.profile })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_STATE' },
    });
    expect(code).not.toBe(other.code);
  });

  it('GET /api/rooms/:code: existente → 200 com o resumo; inexistente ou mal formado → 404', async () => {
    await start();
    const { code } = await createRoom('Ana');
    await joinNew(code, 'Bia');

    const found = await server.http.inject({
      method: 'GET',
      url: `/api/rooms/${code.toLowerCase()}`,
    });
    expect(found.statusCode).toBe(200);
    expect(found.json()).toEqual({ code, status: 'lobby', memberCount: 2, joinable: true });

    for (const missing of ['23456A', 'nao-e-codigo']) {
      const response = await server.http.inject({ method: 'GET', url: `/api/rooms/${missing}` });
      expect(response.statusCode, missing).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'ROOM_NOT_FOUND' } });
    }
  });
});
