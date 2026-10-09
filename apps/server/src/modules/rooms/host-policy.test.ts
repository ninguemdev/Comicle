import { describe, expect, it } from 'vitest';

import { inMatch, testMatch, testMember, testRoom } from '../../../test/support/room-builders';
import { DomainError } from '../../platform/errors';
import {
  assertCanAbortMatch,
  assertCanKick,
  assertCanStartMatch,
  assertCanUpdateSettings,
  assertHost,
  nextHost,
} from './host-policy';

function errorCode(action: () => unknown): string | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'outro erro';
  }
}

describe('host-policy', () => {
  const room = () => testRoom(testMember('ana'), testMember('bia'), testMember('caio'));

  it('R11: só o anfitrião altera as configurações, só no lobby', () => {
    const lobby = room();
    expect(
      errorCode(() => {
        assertCanUpdateSettings(lobby, 'ana');
      }),
    ).toBeUndefined();
    expect(
      errorCode(() => {
        assertCanUpdateSettings(lobby, 'bia');
      }),
    ).toBe('NOT_HOST');

    lobby.status = 'in_match';
    expect(
      errorCode(() => {
        assertCanUpdateSettings(lobby, 'ana');
      }),
    ).toBe('INVALID_STATE');
  });

  it('R12: só o anfitrião expulsa, só no lobby, nunca a si mesmo nem quem não está na sala', () => {
    const lobby = room();
    expect(assertCanKick(lobby, 'ana', 'bia').playerId).toBe('bia');
    expect(errorCode(() => assertCanKick(lobby, 'bia', 'caio'))).toBe('NOT_HOST');
    expect(errorCode(() => assertCanKick(lobby, 'ana', 'ana'))).toBe('INVALID_PAYLOAD');
    expect(errorCode(() => assertCanKick(lobby, 'ana', 'zé'))).toBe('INVALID_PAYLOAD');

    lobby.status = 'in_match';
    expect(errorCode(() => assertCanKick(lobby, 'ana', 'bia'))).toBe('INVALID_STATE');
  });

  it('assertHost aceita só o anfitrião atual', () => {
    expect(
      errorCode(() => {
        assertHost(room(), 'ana');
      }),
    ).toBeUndefined();
    expect(
      errorCode(() => {
        assertHost(room(), 'caio');
      }),
    ).toBe('NOT_HOST');
  });

  it('R14: a função vai para o membro conectado que entrou primeiro', () => {
    const lobby = testRoom(
      testMember('ana', { joinedAt: 0, connected: false }),
      testMember('bia', { joinedAt: 2, connected: false }),
      testMember('caio', { joinedAt: 3 }),
      testMember('davi', { joinedAt: 3 }),
    );

    expect(nextHost(lobby)).toEqual({ playerId: 'caio', pending: false });
  });

  it('R14: sem ninguém conectado, o anfitrião segura a função até alguém se conectar', () => {
    const lobby = testRoom(
      testMember('ana', { connected: false }),
      testMember('bia', { connected: false }),
    );

    expect(nextHost(lobby)).toEqual({ playerId: 'ana', pending: true });
  });

  it('R14: se o anfitrião saiu e ninguém está conectado, o membro mais antigo segura a função', () => {
    const lobby = testRoom(
      testMember('ana', { joinedAt: 0 }),
      testMember('bia', { joinedAt: 1, connected: false }),
      testMember('caio', { joinedAt: 2, connected: false }),
    );
    lobby.members.delete('ana');

    expect(nextHost(lobby)).toEqual({ playerId: 'bia', pending: true });
  });

  it('sala sem membros não tem anfitrião', () => {
    const lobby = testRoom(testMember('ana'));
    lobby.members.clear();

    expect(nextHost(lobby)).toBeNull();
  });
});

describe('host-policy na partida', () => {
  it('R22: só o anfitrião inicia, só no lobby, com pelo menos 2 conectados', () => {
    const lobby = testRoom(testMember('ana'), testMember('bia'), testMember('caio'));
    expect(
      errorCode(() => {
        assertCanStartMatch(lobby, 'ana');
      }),
    ).toBeUndefined();
    expect(
      errorCode(() => {
        assertCanStartMatch(lobby, 'bia');
      }),
    ).toBe('NOT_HOST');

    const alone = testRoom(testMember('ana'), testMember('bia', { connected: false }));
    expect(
      errorCode(() => {
        assertCanStartMatch(alone, 'ana');
      }),
    ).toBe('NOT_ENOUGH_PLAYERS');

    inMatch(lobby, testMatch(['ana', 'bia']));
    expect(
      errorCode(() => {
        assertCanStartMatch(lobby, 'ana');
      }),
    ).toBe('INVALID_STATE');
  });

  it('R57: só o anfitrião aborta, só com partida em andamento', () => {
    const room = testRoom(testMember('ana'), testMember('bia'));
    expect(
      errorCode(() => {
        assertCanAbortMatch(room, 'ana');
      }),
    ).toBe('INVALID_STATE');

    inMatch(room, testMatch(['ana', 'bia']));
    expect(
      errorCode(() => {
        assertCanAbortMatch(room, 'bia');
      }),
    ).toBe('NOT_HOST');
    expect(
      errorCode(() => {
        assertCanAbortMatch(room, 'ana');
      }),
    ).toBeUndefined();
  });

  it('R14: durante a partida, a função vai primeiro para um participante conectado', () => {
    const room = testRoom(
      testMember('ana', { joinedAt: 0, connected: false }),
      testMember('espectador', { joinedAt: 1 }),
      testMember('bia', { joinedAt: 2 }),
    );
    inMatch(room, testMatch(['ana', 'bia']));

    expect(nextHost(room)).toEqual({ playerId: 'bia', pending: false });
  });

  it('R14: sem participante conectado, a função vai para um espectador conectado', () => {
    const room = testRoom(
      testMember('ana', { joinedAt: 0, connected: false }),
      testMember('espectador', { joinedAt: 1 }),
      testMember('bia', { joinedAt: 2, connected: false }),
    );
    inMatch(room, testMatch(['ana', 'bia']));

    expect(nextHost(room)).toEqual({ playerId: 'espectador', pending: false });
  });
});
