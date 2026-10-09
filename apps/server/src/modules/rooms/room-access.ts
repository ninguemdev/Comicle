import { DomainError } from '../../platform/errors';
import type { Scheduler } from '../../platform/scheduler';
import type { Member, Room } from './room';
import type { RoomRegistry } from './room-registry';

export function notInRoom(): DomainError {
  return new DomainError('NOT_IN_ROOM', 'Você não está nesta sala.');
}

/** Runs `task` in the room's queue for the member this socket speaks for. */
export async function runAsMember<T>(
  registry: RoomRegistry,
  socketId: string,
  task: (room: Room, member: Member) => T | Promise<T>,
): Promise<T> {
  const binding = registry.binding(socketId);
  const room = binding && registry.byId(binding.roomId);
  if (!binding || !room) {
    throw notInRoom();
  }
  return room.runExclusive(() => {
    const member = room.members.get(binding.playerId);
    // Checked again inside the queue: a kick or a close may have run in between.
    if (room.closed || !member || registry.binding(socketId) === undefined) {
      throw notInRoom();
    }
    return task(room, member);
  });
}

/** Timer whose task runs in the room's queue, like any other mutation. */
export function scheduleInRoom(
  scheduler: Scheduler,
  room: Room,
  key: string,
  at: number,
  task: () => void | Promise<void>,
): void {
  scheduler.schedule(key, at, () => room.runExclusive(task));
}
