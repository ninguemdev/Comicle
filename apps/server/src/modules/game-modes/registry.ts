import type { GameModeId } from '@comicle/shared';

import { collaborativeMode } from './collaborative/collaborative-mode';
import type { GameMode } from './game-mode';
import { individualMode } from './individual/individual-mode';

const gameModes: Record<GameModeId, GameMode> = {
  collaborative: collaborativeMode,
  individual: individualMode,
};

export function getGameMode(id: GameModeId): GameMode {
  return gameModes[id];
}
