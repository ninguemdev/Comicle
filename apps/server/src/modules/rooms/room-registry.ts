import type { Room } from './room';

/** Which room and player a socket speaks for; a socket is in at most one room (protocolo §2). */
export interface SocketBinding {
  roomId: string;
  playerId: string;
}

/** Active rooms by ID and by code, and the socket ↔ (room, player) links. */
export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();
  private readonly codes = new Map<string, Room>();
  private readonly bindings = new Map<string, SocketBinding>();

  add(room: Room): void {
    this.rooms.set(room.id, room);
    this.codes.set(room.code, room);
  }

  /** Frees the code for new rooms. */
  remove(room: Room): void {
    this.rooms.delete(room.id);
    this.codes.delete(room.code);
  }

  all(): IterableIterator<Room> {
    return this.rooms.values();
  }

  byId(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  byCode(code: string): Room | undefined {
    return this.codes.get(code);
  }

  hasCode(code: string): boolean {
    return this.codes.has(code);
  }

  bind(socketId: string, binding: SocketBinding): void {
    this.bindings.set(socketId, binding);
  }

  unbind(socketId: string): void {
    this.bindings.delete(socketId);
  }

  binding(socketId: string): SocketBinding | undefined {
    return this.bindings.get(socketId);
  }
}
