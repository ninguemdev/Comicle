import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Db } from '../../platform/db/client';
import { matches, panels, rooms, stories, themes } from '../../platform/db/schema';
import {
  assertPanelImageMatchesStatus,
  assertUniquePositions,
  StoryRepositoryError,
  type MatchStatus,
  type NewMatch,
  type NewPanel,
  type StoryRepository,
} from './story-repository';

const FINAL_STATUSES: ReadonlySet<MatchStatus> = new Set(['finished', 'aborted']);

export class DrizzleStoryRepository implements StoryRepository {
  constructor(private readonly db: Db) {}

  async createRoom(room: { id: string; code: string }): Promise<void> {
    await this.db.insert(rooms).values({ id: room.id, code: room.code });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.db.delete(rooms).where(eq(rooms.id, roomId));
  }

  async createMatch(match: NewMatch): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(matches).values({
        id: match.id,
        roomId: match.roomId,
        mode: match.settings.mode,
        settings: match.settings,
        totalRounds: match.totalRounds,
        status: 'in_progress',
        startedAt: new Date(match.startedAt),
      });
      if (match.themes.length > 0) {
        await tx
          .insert(themes)
          .values(match.themes.map((theme) => ({ ...theme, matchId: match.id })));
      }
      if (match.stories.length > 0) {
        await tx
          .insert(stories)
          .values(match.stories.map((story) => ({ ...story, matchId: match.id })));
      }
    });
  }

  async saveRoundPanels(matchId: string, newPanels: NewPanel[]): Promise<void> {
    if (newPanels.length === 0) {
      return;
    }
    assertUniquePositions(newPanels);
    newPanels.forEach(assertPanelImageMatchesStatus);

    // Stories never move between matches, so checking before the insert is safe.
    const storyIds = [...new Set(newPanels.map((panel) => panel.storyId))];
    const owned = await this.db
      .select({ id: stories.id })
      .from(stories)
      .where(and(eq(stories.matchId, matchId), inArray(stories.id, storyIds)));
    if (owned.length !== storyIds.length) {
      throw new StoryRepositoryError('Quadro de história que não pertence à partida');
    }

    // One multi-row INSERT is a single atomic statement: a position already taken violates
    // UNIQUE (story_id, position) and no row of the round is written.
    await this.db.insert(panels).values(
      newPanels.map((panel) => ({
        id: panel.id,
        storyId: panel.storyId,
        position: panel.position,
        artistPlayerId: panel.artistPlayerId,
        artistNickname: panel.artistNickname,
        status: panel.status,
        image: panel.png,
        byteSize: panel.png?.byteLength ?? 0,
      })),
    );
  }

  async getPanelImage(panelId: string): Promise<{ png: Uint8Array } | null> {
    const [row] = await this.db
      .select({ image: panels.image })
      .from(panels)
      .where(eq(panels.id, panelId));
    return row?.image ? { png: row.image } : null;
  }

  async setMatchStatus(matchId: string, status: MatchStatus): Promise<void> {
    await this.db
      .update(matches)
      .set({ status, finishedAt: FINAL_STATUSES.has(status) ? sql`now()` : null })
      .where(eq(matches.id, matchId));
  }

  async deleteMatch(matchId: string): Promise<void> {
    await this.db.delete(matches).where(eq(matches.id, matchId));
  }

  async deleteAllOpenRooms(): Promise<number> {
    const deleted = await this.db
      .delete(rooms)
      .where(isNull(rooms.closedAt))
      .returning({ id: rooms.id });
    return deleted.length;
  }
}
