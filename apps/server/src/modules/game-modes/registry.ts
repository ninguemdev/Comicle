import type { GameModeId } from '@comicle/shared';

import { DomainError } from '../../platform/errors';
import { collaborativeMode } from './collaborative/collaborative-mode';
import type { GameMode } from './game-mode';

/** v1 registers only the collaborative mode; `individual` arrives in v2 (R21). */
const gameModes: Partial<Record<GameModeId, GameMode>> = {
  collaborative: collaborativeMode,
};

export function getGameMode(id: GameModeId): GameMode {
  const mode = gameModes[id];
  if (!mode) {
    throw new DomainError('INVALID_PAYLOAD', 'Modo de jogo indisponível.');
  }
  return mode;
}
