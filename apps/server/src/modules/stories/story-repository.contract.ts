// Contract suite shared by both StoryRepository implementations:
// in memory (pnpm test) and Postgres (pnpm test:db).

import { beforeEach, describe, expect, it } from 'vitest';

import { newId } from '../../platform/ids';
import type { NewMatch, NewPanel, StoryRepository } from './story-repository';

export interface ContractSubject {
  repository: StoryRepository;
  /** Leaves the storage empty before each test. */
  reset(): Promise<void>;
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function newMatch(roomId: string, storyCount = 2): NewMatch {
  const themes = Array.from({ length: storyCount }, (_, seat) => ({
    id: newId(),
    authorPlayerId: newId(),
    authorNickname: `Jogador ${String(seat + 1)}`,
    text: `Tema ${String(seat + 1)}`,
    source: 'player' as const,
    seat,
  }));
  return {
    id: newId(),
    roomId,
    settings: { mode: 'collaborative', panelCount: { kind: 'per_player' }, drawingSeconds: 90 },
    totalRounds: storyCount,
    startedAt: Date.UTC(2026, 0, 1),
    themes,
    stories: themes.map((theme, position) => ({ id: newId(), themeId: theme.id, position })),
  };
}

function panel(storyId: string, position: number, png: Uint8Array | null = PNG_BYTES): NewPanel {
  return {
    id: newId(),
    storyId,
    position,
    artistPlayerId: newId(),
    artistNickname: 'Artista',
    status: png ? 'complete' : 'empty',
    png,
  };
}

function storyIdsOf(match: NewMatch): [string, string] {
  const [first, second] = match.stories;
  if (!first || !second) {
    throw new Error('a partida de teste precisa de duas histórias');
  }
  return [first.id, second.id];
}

export function runStoryRepositoryContract(create: () => ContractSubject): void {
  describe('StoryRepository (contrato)', () => {
    const subject = create();
    let repository: StoryRepository;

    beforeEach(async () => {
      await subject.reset();
      repository = subject.repository;
    });

    async function roomWithMatch() {
      const roomId = newId();
      await repository.createRoom({ id: roomId, code: 'K7PQ2M' });
      const match = newMatch(roomId);
      await repository.createMatch(match);
      return { roomId, match, storyIds: storyIdsOf(match) };
    }

    it('createRoom → createMatch → saveRoundPanels → getPanelImage devolve os mesmos bytes', async () => {
      const { match, storyIds } = await roomWithMatch();
      const saved = panel(storyIds[0], 0);

      await repository.saveRoundPanels(match.id, [saved, panel(storyIds[1], 0)]);

      expect(await repository.getPanelImage(saved.id)).toEqual({ png: PNG_BYTES });
    });

    it('saveRoundPanels é atômico: posição duplicada faz nada ser salvo', async () => {
      const { match, storyIds } = await roomWithMatch();
      const first = panel(storyIds[0], 0);

      await expect(
        repository.saveRoundPanels(match.id, [first, panel(storyIds[0], 0)]),
      ).rejects.toThrow();

      expect(await repository.getPanelImage(first.id)).toBeNull();
    });

    it('saveRoundPanels é atômico: posição já ocupada por uma rodada anterior', async () => {
      const { match, storyIds } = await roomWithMatch();
      await repository.saveRoundPanels(match.id, [panel(storyIds[0], 0)]);
      const fresh = panel(storyIds[1], 0);

      await expect(
        repository.saveRoundPanels(match.id, [fresh, panel(storyIds[0], 0)]),
      ).rejects.toThrow();

      expect(await repository.getPanelImage(fresh.id)).toBeNull();
    });

    it('saveRoundPanels recusa quadro de história de outra partida', async () => {
      const { storyIds } = await roomWithMatch();
      const other = await roomWithMatch();

      await expect(
        repository.saveRoundPanels(other.match.id, [panel(storyIds[0], 0)]),
      ).rejects.toThrow();
    });

    it('saveRoundPanels recusa imagem incoerente com o status', async () => {
      const { match, storyIds } = await roomWithMatch();

      await expect(
        repository.saveRoundPanels(match.id, [{ ...panel(storyIds[0], 0), status: 'empty' }]),
      ).rejects.toThrow();
      await expect(
        repository.saveRoundPanels(match.id, [
          { ...panel(storyIds[0], 0, null), status: 'partial' },
        ]),
      ).rejects.toThrow();
    });

    it('deleteRoom apaga em cascata partidas, temas, histórias e quadros', async () => {
      const { roomId, match, storyIds } = await roomWithMatch();
      const saved = panel(storyIds[0], 0);
      await repository.saveRoundPanels(match.id, [saved]);

      await repository.deleteRoom(roomId);

      expect(await repository.getPanelImage(saved.id)).toBeNull();
      // The match is gone: a new match with the same IDs can only fail on the missing room.
      await expect(repository.createMatch(match)).rejects.toThrow();
      await repository.createRoom({ id: roomId, code: 'K7PQ2M' });
      await expect(repository.createMatch(match)).resolves.toBeUndefined();
    });

    it('R25: deleteMatch apaga só aquela partida', async () => {
      const { roomId, match, storyIds } = await roomWithMatch();
      const previous = panel(storyIds[0], 0);
      await repository.saveRoundPanels(match.id, [previous]);
      const next = newMatch(roomId);
      await repository.createMatch(next);
      const kept = panel(storyIdsOf(next)[0], 0);
      await repository.saveRoundPanels(next.id, [kept]);

      await repository.deleteMatch(match.id);

      expect(await repository.getPanelImage(previous.id)).toBeNull();
      expect(await repository.getPanelImage(kept.id)).toEqual({ png: PNG_BYTES });
    });

    it('R17: deleteAllOpenRooms remove todas as salas e devolve a contagem', async () => {
      const { match, storyIds } = await roomWithMatch();
      const saved = panel(storyIds[0], 0);
      await repository.saveRoundPanels(match.id, [saved]);
      await repository.createRoom({ id: newId(), code: 'ABCDEF' });

      expect(await repository.deleteAllOpenRooms()).toBe(2);
      expect(await repository.getPanelImage(saved.id)).toBeNull();
      expect(await repository.deleteAllOpenRooms()).toBe(0);
    });

    it('getPanelImage de ID inexistente → null; de quadro empty → null', async () => {
      const { match, storyIds } = await roomWithMatch();
      const empty = panel(storyIds[0], 0, null);
      await repository.saveRoundPanels(match.id, [empty]);

      expect(await repository.getPanelImage(newId())).toBeNull();
      expect(await repository.getPanelImage(empty.id)).toBeNull();
    });

    it('setMatchStatus aceita as transições da partida', async () => {
      const { match } = await roomWithMatch();

      await repository.setMatchStatus(match.id, 'presenting');
      await repository.setMatchStatus(match.id, 'finished');
      await expect(repository.setMatchStatus(match.id, 'aborted')).resolves.toBeUndefined();
    });
  });
}
