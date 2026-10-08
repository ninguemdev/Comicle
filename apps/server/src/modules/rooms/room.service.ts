import {
  EMPTY_ROOM_TTL_MS,
  HOST_TRANSFER_GRACE_MS,
  LOBBY_DISCONNECT_REMOVE_MS,
  ROOM_MAX_AGE_MS,
  type Empty,
  type MatchSettings,
  type PlayerProfile,
  type Rng,
} from '@comicle/shared';
import type { FastifyBaseLogger } from 'fastify';

import type { Clock } from '../../platform/clock';
import { DomainError } from '../../platform/errors';
import type { Scheduler } from '../../platform/scheduler';
import type { StoryRepository } from '../stories/story-repository';
import type { PublishRoom } from '../views/room-publisher';
import { assertCanKick, assertCanUpdateSettings, assertLobby, nextHost } from './host-policy';
import { Room, socketIdOf, type Member } from './room';
import type { RoomBroadcaster } from './room-broadcaster';
import { generateUniqueRoomCode } from './room-code';
import type { RoomRegistry } from './room-registry';

/** The connection asking for something: its socket and the guest session behind it. */
export interface RoomActor {
  socketId: string;
  guestId: string;
}

export interface RoomServiceDeps {
  clock: Clock;
  scheduler: Scheduler;
  rng: Rng;
  newId: () => string;
  storyRepository: StoryRepository;
  registry: RoomRegistry;
  broadcaster: RoomBroadcaster;
  publish: PublishRoom;
  log: FastifyBaseLogger;
}

/** One timer per key (arquitetura §4, Tempo); every key of a room starts with its ID. */
const timerKeys = {
  hostTransfer: (room: Room) => `room:${room.id}:host-transfer`,
  removal: (room: Room, playerId: string) => `room:${room.id}:remove:${playerId}`,
  empty: (room: Room) => `room:${room.id}:empty`,
  maxAge: (room: Room) => `room:${room.id}:max-age`,
};

function notInRoom(): DomainError {
  return new DomainError('NOT_IN_ROOM', 'Você não está nesta sala.');
}

/**
 * Rooms: creation, joining, presence, host, kick, settings and closing (R4–R16). Every
 * mutation, timers included, runs inside `room.runExclusive` and ends with `publish(room)`.
 */
export class RoomService {
  constructor(private readonly deps: RoomServiceDeps) {}

  /** R6, R8. */
  async create(actor: RoomActor, profile: PlayerProfile): Promise<{ roomCode: string }> {
    const { registry, clock } = this.deps;
    this.assertOutsideRooms(actor.socketId);
    const now = clock.now();
    const host: Member = {
      playerId: this.deps.newId(),
      guestId: actor.guestId,
      profile,
      joinedAt: now,
      connection: { socketId: actor.socketId },
    };
    const code = generateUniqueRoomCode(this.deps.rng, (candidate) => registry.hasCode(candidate));
    const room = new Room({ id: this.deps.newId(), code, createdAt: now, host });
    // Registered before the first await: the code and the socket are taken right away.
    registry.add(room);
    registry.bind(actor.socketId, { roomId: room.id, playerId: host.playerId });

    return room.runExclusive(async () => {
      try {
        await this.deps.storyRepository.createRoom({ id: room.id, code });
      } catch (error) {
        room.closed = true;
        registry.remove(room);
        registry.unbind(actor.socketId);
        throw error;
      }
      this.schedule(room, timerKeys.maxAge(room), now + ROOM_MAX_AGE_MS, () => this.close(room));
      this.deps.publish(room);
      return { roomCode: code };
    });
  }

  /** R9, R12, R13, R14, R5: new member or reconnection of an existing one. */
  async join(
    actor: RoomActor,
    roomCode: string,
    profile: PlayerProfile,
  ): Promise<{ roomCode: string }> {
    const room = this.deps.registry.byCode(roomCode);
    if (!room) {
      throw new DomainError('ROOM_NOT_FOUND', 'Sala não encontrada.');
    }
    return room.runExclusive(() => {
      if (room.closed) {
        throw new DomainError('ROOM_CLOSED', 'Esta sala foi encerrada.');
      }
      const binding = this.deps.registry.binding(actor.socketId);
      if (binding && binding.roomId !== room.id) {
        throw new DomainError('INVALID_STATE', 'Você já está em outra sala.');
      }
      if (room.bannedGuestIds.has(actor.guestId)) {
        throw new DomainError('KICKED', 'Você foi removido desta sala pelo anfitrião.');
      }
      const existing = room.memberByGuest(actor.guestId);
      if (existing) {
        this.reconnect(room, existing, actor, profile);
      } else {
        this.addMember(room, actor, profile);
      }
      this.deps.publish(room);
      return { roomCode: room.code };
    });
  }

  /** R15 (lobby): the member is removed; R14 if it was the host. */
  leave(socketId: string): Promise<Empty> {
    return this.withMember(socketId, async (room, member) => {
      this.deps.registry.unbind(socketId);
      await this.removeMember(room, member);
      return {};
    });
  }

  /** R12. */
  kick(socketId: string, targetPlayerId: string): Promise<Empty> {
    return this.withMember(socketId, async (room, actor) => {
      const target = assertCanKick(room, actor.playerId, targetPlayerId);
      room.bannedGuestIds.add(target.guestId);
      const targetSocket = socketIdOf(target);
      if (targetSocket !== null) {
        this.deps.registry.unbind(targetSocket);
        this.deps.broadcaster.sendRemoved(targetSocket, 'kicked');
      }
      await this.removeMember(room, target);
      return {};
    });
  }

  /** R11, R18–R21 (the payload schema already rejects invalid settings). */
  updateSettings(socketId: string, settings: MatchSettings): Promise<Empty> {
    return this.withMember(socketId, (room, actor) => {
      assertCanUpdateSettings(room, actor.playerId);
      room.settings = settings;
      this.deps.publish(room);
      return {};
    });
  }

  /** R4: only in the lobby (the payload schema already validates nickname and avatar). */
  updateProfile(socketId: string, profile: PlayerProfile): Promise<Empty> {
    return this.withMember(socketId, (room, member) => {
      assertLobby(room);
      member.profile = profile;
      this.deps.publish(room);
      return {};
    });
  }

  /** R13, R14, R16: the socket dropped; the member stays, shown as disconnected. */
  async handleDisconnect(socketId: string): Promise<void> {
    const binding = this.deps.registry.binding(socketId);
    const room = binding && this.deps.registry.byId(binding.roomId);
    if (!binding || !room) {
      return;
    }
    await room.runExclusive(() => {
      // A replaced or kicked socket was already unbound: nothing left to do for it.
      const member = room.members.get(binding.playerId);
      if (room.closed || !member || socketIdOf(member) !== socketId) {
        return;
      }
      this.deps.registry.unbind(socketId);
      const now = this.deps.clock.now();
      member.connection = { disconnectedAt: now };
      this.schedule(
        room,
        timerKeys.removal(room, member.playerId),
        now + LOBBY_DISCONNECT_REMOVE_MS,
        () => this.removeIfStillAway(room, member.playerId),
      );
      if (member.playerId === room.hostPlayerId) {
        this.schedule(room, timerKeys.hostTransfer(room), now + HOST_TRANSFER_GRACE_MS, () => {
          this.transferHostIfStillAway(room);
        });
      }
      this.updateEmptiness(room);
      this.deps.publish(room);
    });
  }

  private addMember(room: Room, actor: RoomActor, profile: PlayerProfile): void {
    if (room.isFull()) {
      throw new DomainError('ROOM_FULL', 'Esta sala já está cheia.');
    }
    const member: Member = {
      playerId: this.deps.newId(),
      guestId: actor.guestId,
      profile,
      joinedAt: this.deps.clock.now(),
      connection: { socketId: actor.socketId },
    };
    room.members.set(member.playerId, member);
    this.connected(room, member, actor.socketId);
  }

  /** R9: never blocked by capacity. R5: a previous connection of the session is replaced. */
  private reconnect(room: Room, member: Member, actor: RoomActor, profile: PlayerProfile): void {
    const previousSocket = socketIdOf(member);
    if (previousSocket !== null && previousSocket !== actor.socketId) {
      this.deps.registry.unbind(previousSocket);
      this.deps.broadcaster.replaceSession(previousSocket);
    }
    member.connection = { socketId: actor.socketId };
    if (room.status === 'lobby') {
      member.profile = profile;
    }
    this.connected(room, member, actor.socketId);
  }

  /** Binds the socket and cancels whatever its absence had started. */
  private connected(room: Room, member: Member, socketId: string): void {
    const { registry, scheduler } = this.deps;
    registry.bind(socketId, { roomId: room.id, playerId: member.playerId });
    scheduler.cancel(timerKeys.removal(room, member.playerId));
    if (member.playerId === room.hostPlayerId) {
      scheduler.cancel(timerKeys.hostTransfer(room));
    }
    // R14: nobody was connected when the host lost the role; whoever connects first takes it.
    if (room.hostTransferPending) {
      room.hostPlayerId = member.playerId;
      room.hostTransferPending = false;
      scheduler.cancel(timerKeys.hostTransfer(room));
    }
    this.updateEmptiness(room);
  }

  /** Removes a member; a room left without members closes right away. */
  private async removeMember(room: Room, member: Member): Promise<void> {
    room.members.delete(member.playerId);
    this.deps.scheduler.cancel(timerKeys.removal(room, member.playerId));
    if (room.members.size === 0) {
      await this.close(room);
      return;
    }
    if (member.playerId === room.hostPlayerId) {
      this.handOverHost(room);
    }
    this.updateEmptiness(room);
    this.deps.publish(room);
  }

  /** R14. */
  private handOverHost(room: Room): void {
    this.deps.scheduler.cancel(timerKeys.hostTransfer(room));
    const choice = nextHost(room);
    if (choice) {
      room.hostPlayerId = choice.playerId;
      room.hostTransferPending = choice.pending;
    }
  }

  /** R13: removal timer fired; the member did not come back. */
  private async removeIfStillAway(room: Room, playerId: string): Promise<void> {
    const member = room.members.get(playerId);
    if (room.closed || !member || socketIdOf(member) !== null) {
      return;
    }
    await this.removeMember(room, member);
  }

  /** R14: grace period over and the host is still away. */
  private transferHostIfStillAway(room: Room): void {
    const host = room.members.get(room.hostPlayerId);
    if (room.closed || !host || socketIdOf(host) !== null) {
      return;
    }
    this.handOverHost(room);
    this.deps.publish(room);
  }

  /** R16: starts or stops the countdown of a room with nobody connected. */
  private updateEmptiness(room: Room): void {
    const key = timerKeys.empty(room);
    if (room.connectedMembers().length > 0) {
      room.emptySince = null;
      this.deps.scheduler.cancel(key);
      return;
    }
    if (room.emptySince === null) {
      room.emptySince = this.deps.clock.now();
      this.schedule(room, key, room.emptySince + EMPTY_ROOM_TTL_MS, () => this.close(room));
    }
  }

  /**
   * R16: everyone still connected is told, timers stop, the code is freed and the content is
   * deleted. A database failure is only logged: the boot cleanup (R17) removes leftovers.
   */
  private async close(room: Room): Promise<void> {
    if (room.closed) {
      return;
    }
    room.closed = true;
    const { registry, scheduler, broadcaster } = this.deps;
    for (const key of [
      timerKeys.hostTransfer(room),
      timerKeys.empty(room),
      timerKeys.maxAge(room),
    ]) {
      scheduler.cancel(key);
    }
    for (const member of room.members.values()) {
      scheduler.cancel(timerKeys.removal(room, member.playerId));
      const socketId = socketIdOf(member);
      if (socketId !== null) {
        registry.unbind(socketId);
        broadcaster.sendRemoved(socketId, 'closed');
      }
    }
    registry.remove(room);
    try {
      await this.deps.storyRepository.deleteRoom(room.id);
    } catch (error) {
      this.deps.log.error({ err: error, roomId: room.id }, 'failed to delete closed room');
    }
  }

  /** Timer whose task runs in the room's queue, like any other mutation. */
  private schedule(room: Room, key: string, at: number, task: () => void | Promise<void>): void {
    this.deps.scheduler.schedule(key, at, () => room.runExclusive(task));
  }

  /** Runs `task` in the room's queue for the member this socket speaks for. */
  private async withMember<T>(
    socketId: string,
    task: (room: Room, member: Member) => T | Promise<T>,
  ): Promise<T> {
    const binding = this.deps.registry.binding(socketId);
    const room = binding && this.deps.registry.byId(binding.roomId);
    if (!binding || !room) {
      throw notInRoom();
    }
    return room.runExclusive(() => {
      const member = room.members.get(binding.playerId);
      // Checked again inside the queue: a kick or a close may have run in between.
      if (room.closed || !member || this.deps.registry.binding(socketId) === undefined) {
        throw notInRoom();
      }
      return task(room, member);
    });
  }

  private assertOutsideRooms(socketId: string): void {
    if (this.deps.registry.binding(socketId)) {
      throw new DomainError('INVALID_STATE', 'Você já está em uma sala.');
    }
  }
}
