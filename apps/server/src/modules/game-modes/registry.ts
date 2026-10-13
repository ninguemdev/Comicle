import type { GameModeId } from '@comicle/shared';

import { DomainError } from '../../platform/errors';
import { collaborativeMode } from './collaborative/collaborative-mode';
import type { GameMode } from './game-mode';

/**
 * The modes a match can run. `individual` already has its rules (individual/individual-mode.ts),
 * but only joins once the rounds support it (T36); until then starting it is refused (R21).
 */
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
