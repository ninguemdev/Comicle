import { DomainError } from '../../platform/errors';
import type { Match } from '../matches/match';
import type { Room } from '../rooms/room';
import { notInRoom } from '../rooms/room-access';
import type { RoomRegistry } from '../rooms/room-registry';
import type { StoryRepository } from '../stories/story-repository';
import { canAccessPanel } from './panel-access-policy';

export interface DrawingServiceDeps {
  registry: RoomRegistry;
  storyRepository: StoryRepository;
}

function panelNotFound(): DomainError {
  return new DomainError('PANEL_NOT_FOUND', 'Quadro não encontrado.');
}

function hasPanel(match: Match, panelId: string): boolean {
  return match.stories.some((story) => story.panels.some((panel) => panel.id === panelId));
}

/**
 * Panel images over HTTP (D14, R59) and the player's own draft (R48). Read-only: nothing here
 * changes a room, so it does not wait in the room's queue.
 */
export class DrawingService {
  constructor(private readonly deps: DrawingServiceDeps) {}

  /** R59: the PNG of a panel, only when the PanelAccessPolicy allows it. */
  async panelImage(guestId: string, panelId: string): Promise<Uint8Array> {
    const room = this.roomWithPanel(panelId);
    if (!room?.match) {
      throw panelNotFound();
    }
    const member = room.memberByGuest(guestId);
    if (!member || !canAccessPanel(room.match, member.playerId, panelId)) {
      throw new DomainError('FORBIDDEN', 'Você não pode ver este quadro agora.');
    }
    // `null` for an empty panel: there is no image to send.
    const image = await this.deps.storyRepository.getPanelImage(panelId);
    if (!image) {
      throw panelNotFound();
    }
    return image.png;
  }

  /** R48: the player's latest autosave of the round being drawn, or `null`. */
  myDraft(guestId: string, roomCode: string): Uint8Array | null {
    const room = this.deps.registry.byCode(roomCode);
    if (!room || room.closed) {
      throw new DomainError('ROOM_NOT_FOUND', 'Sala não encontrada.');
    }
    const member = room.memberByGuest(guestId);
    if (!member) {
      throw notInRoom();
    }
    const { match } = room;
    if (match?.phase !== 'round_drawing' && match?.phase !== 'round_closing') {
      return null;
    }
    return match.round?.drafts.get(member.playerId) ?? null;
  }

  private roomWithPanel(panelId: string): Room | undefined {
    for (const room of this.deps.registry.all()) {
      if (!room.closed && room.match && hasPanel(room.match, panelId)) {
        return room;
      }
    }
    return undefined;
  }
}
