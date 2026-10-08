import {
  assertPanelImageMatchesStatus,
  assertUniquePositions,
  StoryRepositoryError,
  type MatchStatus,
  type NewMatch,
  type NewPanel,
  type StoryRepository,
} from './story-repository';

interface StoredPanel {
  storyId: string;
  position: number;
  png: Uint8Array | null;
}

/** Runs a synchronous operation as a promise, so failures reject like a database call. */
function run<T>(operation: () => T): Promise<T> {
  return new Promise((resolve) => {
    resolve(operation());
  });
}

/**
 * Same contract as the Postgres repository (story-repository.contract.ts), including foreign
 * keys, cascades and the (story_id, position) uniqueness. Used by unit and realtime tests.
 */
export class InMemoryStoryRepository implements StoryRepository {
  private readonly rooms = new Map<string, { closed: boolean }>();
  private readonly matches = new Map<string, { roomId: string; status: MatchStatus }>();
  private readonly themes = new Map<string, { matchId: string }>();
  private readonly stories = new Map<string, { matchId: string; themeId: string }>();
  private readonly panels = new Map<string, StoredPanel>();

  createRoom(room: { id: string; code: string }): Promise<void> {
    return run(() => {
      this.assertNewId(this.rooms, room.id);
      this.rooms.set(room.id, { closed: false });
    });
  }

  deleteRoom(roomId: string): Promise<void> {
    return run(() => {
      this.removeRoom(roomId);
    });
  }

  createMatch(match: NewMatch): Promise<void> {
    return run(() => {
      if (!this.rooms.has(match.roomId)) {
        throw new StoryRepositoryError(`Sala ${match.roomId} não existe`);
      }
      this.assertNewId(this.matches, match.id);
      const themeIds = new Set(match.themes.map((theme) => theme.id));
      for (const theme of match.themes) {
        this.assertNewId(this.themes, theme.id);
      }
      for (const story of match.stories) {
        this.assertNewId(this.stories, story.id);
        if (!themeIds.has(story.themeId) && !this.themes.has(story.themeId)) {
          throw new StoryRepositoryError(`Tema ${story.themeId} não existe`);
        }
      }

      this.matches.set(match.id, { roomId: match.roomId, status: 'in_progress' });
      for (const theme of match.themes) {
        this.themes.set(theme.id, { matchId: match.id });
      }
      for (const story of match.stories) {
        this.stories.set(story.id, { matchId: match.id, themeId: story.themeId });
      }
    });
  }

  saveRoundPanels(matchId: string, panels: NewPanel[]): Promise<void> {
    return run(() => {
      // Everything is validated before the first write, so a failure saves nothing.
      assertUniquePositions(panels);
      for (const panel of panels) {
        assertPanelImageMatchesStatus(panel);
        this.assertNewId(this.panels, panel.id);
        if (this.stories.get(panel.storyId)?.matchId !== matchId) {
          throw new StoryRepositoryError(`História ${panel.storyId} não pertence à partida`);
        }
        if (this.hasPanelAt(panel.storyId, panel.position)) {
          throw new StoryRepositoryError(`Posição ${String(panel.position)} já ocupada`);
        }
      }

      for (const panel of panels) {
        this.panels.set(panel.id, {
          storyId: panel.storyId,
          position: panel.position,
          png: panel.png && new Uint8Array(panel.png),
        });
      }
    });
  }

  getPanelImage(panelId: string): Promise<{ png: Uint8Array } | null> {
    return run(() => {
      const png = this.panels.get(panelId)?.png;
      return png ? { png: new Uint8Array(png) } : null;
    });
  }

  setMatchStatus(matchId: string, status: MatchStatus): Promise<void> {
    return run(() => {
      const match = this.matches.get(matchId);
      if (match) {
        match.status = status;
      }
    });
  }

  deleteMatch(matchId: string): Promise<void> {
    return run(() => {
      this.removeMatch(matchId);
    });
  }

  deleteAllOpenRooms(): Promise<number> {
    return run(() => {
      const open = [...this.rooms].filter(([, room]) => !room.closed).map(([id]) => id);
      for (const roomId of open) {
        this.removeRoom(roomId);
      }
      return open.length;
    });
  }

  private assertNewId(table: ReadonlyMap<string, unknown>, id: string): void {
    if (table.has(id)) {
      throw new StoryRepositoryError(`ID duplicado: ${id}`);
    }
  }

  private hasPanelAt(storyId: string, position: number): boolean {
    for (const panel of this.panels.values()) {
      if (panel.storyId === storyId && panel.position === position) {
        return true;
      }
    }
    return false;
  }

  private removeRoom(roomId: string): void {
    for (const [matchId, match] of this.matches) {
      if (match.roomId === roomId) {
        this.removeMatch(matchId);
      }
    }
    this.rooms.delete(roomId);
  }

  private removeMatch(matchId: string): void {
    for (const [storyId, story] of this.stories) {
      if (story.matchId === matchId) {
        this.removeStory(storyId);
      }
    }
    for (const [themeId, theme] of this.themes) {
      if (theme.matchId === matchId) {
        this.themes.delete(themeId);
      }
    }
    this.matches.delete(matchId);
  }

  private removeStory(storyId: string): void {
    for (const [panelId, panel] of this.panels) {
      if (panel.storyId === storyId) {
        this.panels.delete(panelId);
      }
    }
    this.stories.delete(storyId);
  }
}
