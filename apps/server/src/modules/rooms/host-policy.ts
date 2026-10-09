import { MIN_PLAYERS } from '@comicle/shared';

import { DomainError } from '../../platform/errors';
import { isParticipant } from '../matches/match';
import { isConnected, type Member, type Room } from './room';

// Who may do what as host, and who becomes host (arquitetura §7: authorization in one place).

export function assertHost(room: Room, playerId: string): void {
  if (room.hostPlayerId !== playerId) {
    throw new DomainError('NOT_HOST', 'Só o anfitrião pode fazer isso.');
  }
}

export function assertLobby(room: Room): void {
  if (room.status !== 'lobby') {
    throw new DomainError('INVALID_STATE', 'Isso só pode ser feito no lobby.');
  }
}

/** R11: only the host, only in the lobby. */
export function assertCanUpdateSettings(room: Room, actorId: string): void {
  assertHost(room, actorId);
  assertLobby(room);
}

/** R12: only the host, only in the lobby, never themselves. Returns the member to kick. */
export function assertCanKick(room: Room, actorId: string, targetId: string): Member {
  assertHost(room, actorId);
  assertLobby(room);
  if (targetId === actorId) {
    throw new DomainError('INVALID_PAYLOAD', 'O anfitrião não pode expulsar a si mesmo.');
  }
  const target = room.members.get(targetId);
  if (!target) {
    throw new DomainError('INVALID_PAYLOAD', 'Esse jogador não está na sala.');
  }
  return target;
}

/** R22: only the host, only in the lobby, with at least `MIN_PLAYERS` members connected. */
export function assertCanStartMatch(room: Room, actorId: string): void {
  assertHost(room, actorId);
  assertLobby(room);
  if (room.connectedMembers().length < MIN_PLAYERS) {
    throw new DomainError(
      'NOT_ENOUGH_PLAYERS',
      `São necessários pelo menos ${String(MIN_PLAYERS)} jogadores conectados.`,
    );
  }
}

/** R57: only the host, only during a match. */
export function assertCanAbortMatch(room: Room, actorId: string): void {
  assertHost(room, actorId);
  if (room.match === null) {
    throw new DomainError('INVALID_STATE', 'Não há partida em andamento.');
  }
}

export interface HostChoice {
  playerId: string;
  /** Nobody is connected: the role goes to the first member who connects (R14). */
  pending: boolean;
}

/**
 * R14: after the host leaves or loses the role, it goes to the connected member who joined
 * first, participants of the match in progress first. With nobody connected, the current host
 * keeps it (or the oldest member, if the host left) until someone connects. `null` only for a
 * room without members.
 */
export function nextHost(room: Room): HostChoice | null {
  const ordered = room.orderedMembers();
  const { match } = room;
  const connected =
    (match && ordered.find((m) => isConnected(m) && isParticipant(match, m.playerId))) ??
    ordered.find(isConnected);
  if (connected) {
    return { playerId: connected.playerId, pending: false };
  }
  const keeper = room.members.has(room.hostPlayerId) ? room.hostPlayerId : ordered[0]?.playerId;
  return keeper === undefined ? null : { playerId: keeper, pending: true };
}
