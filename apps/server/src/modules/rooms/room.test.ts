import { describe, expect, it } from 'vitest';

import { testMember, testRoom } from '../../../test/support/room-builders';
import { defaultMatchSettings } from './room';

describe('Room', () => {
  it('runExclusive executa uma tarefa por vez, na ordem de chegada', async () => {
    const room = testRoom(testMember('ana'));
    const steps: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstStarted = new Promise<void>((resolve) => {
      void room.runExclusive(async () => {
        steps.push('primeira:início');
        resolve();
        await new Promise<void>((release) => {
          releaseFirst = release;
        });
        steps.push('primeira:fim');
      });
    });
    const second = room.runExclusive(() => {
      steps.push('segunda');
    });

    await firstStarted;
    expect(steps).toEqual(['primeira:início']);

    releaseFirst();
    await second;
    expect(steps).toEqual(['primeira:início', 'primeira:fim', 'segunda']);
  });

  it('uma tarefa que falha rejeita só para quem a pediu e não trava a fila', async () => {
    const room = testRoom(testMember('ana'));

    const failed = room.runExclusive(() => {
      throw new Error('falhou');
    });
    const next = room.runExclusive(() => 'seguiu');

    await expect(failed).rejects.toThrow('falhou');
    await expect(next).resolves.toBe('seguiu');
  });

  it('R8, R19: o criador é o anfitrião, a sala começa no lobby com as configurações padrão', () => {
    const room = testRoom(testMember('ana'));

    expect(room.hostPlayerId).toBe('ana');
    expect(room.status).toBe('lobby');
    expect(room.settings).toEqual({
      mode: 'collaborative',
      panelCount: { kind: 'per_player' },
      drawingSeconds: 90,
    });
    expect(defaultMatchSettings()).toEqual(room.settings);
  });

  it('membros ficam em ordem de joinedAt, com empate pela ordem de entrada', () => {
    const room = testRoom(
      testMember('ana', { joinedAt: 10 }),
      testMember('bia', { joinedAt: 5 }),
      testMember('caio', { joinedAt: 10 }),
    );

    expect(room.orderedMembers().map((member) => member.playerId)).toEqual(['bia', 'ana', 'caio']);
  });

  it('acha membro pelo guestId e lista só os conectados', () => {
    const room = testRoom(testMember('ana'), testMember('bia', { connected: false }));

    expect(room.memberByGuest('guest-bia')?.playerId).toBe('bia');
    expect(room.memberByGuest('guest-zé')).toBeUndefined();
    expect(room.connectedMembers().map((member) => member.playerId)).toEqual(['ana']);
  });

  it('R9: cheia com MAX_PLAYERS membros', () => {
    const members = Array.from({ length: 12 }, (_, index) => testMember(`p${String(index)}`));

    expect(testRoom(...members.slice(0, 11)).isFull()).toBe(false);
    expect(testRoom(...members).isFull()).toBe(true);
  });
});
