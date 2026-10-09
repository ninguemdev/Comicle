import { describe, expect, it } from 'vitest';

import {
  assignedStoryIndex,
  generateMatch,
  panelIdOf,
} from '../../../test/support/generated-matches';
import { SeededRng } from '../../platform/random';
import type { Match } from '../matches/match';
import { canAccessPanel } from './panel-access-policy';

// R59 as a matrix (T19): every panel ID of generated matches (drawn or not yet), for every
// player and spectator, at every moment. Membership itself is checked by DrawingService.

const MATCHES = 30;

/** The rules, straight: own reading before confirming (R36, R47), revealed panels (R54). */
function mayAccess(match: Match, viewer: string, panelId: string): boolean {
  switch (match.phase) {
    case 'round_reading': {
      if (match.round?.ready.has(viewer)) return false;
      const story = assignedStoryIndex(match, viewer);
      const panels = story === undefined ? [] : (match.stories[story]?.panels ?? []);
      return panels.some((panel) => panel.id === panelId);
    }
    case 'presentation': {
      const cursor = match.presentation;
      if (!cursor) return false;
      return match.stories.some((story, index) =>
        story.panels.some(
          (panel) =>
            panel.id === panelId &&
            (index < cursor.maxStoryReached ||
              (index === cursor.maxStoryReached &&
                panel.position < (cursor.revealedCount[index] ?? 0))),
        ),
      );
    }
    case 'theme_writing':
    case 'round_drawing':
    case 'round_closing':
      return false;
    default:
      return match.phase satisfies never;
  }
}

describe('matriz de acesso às imagens (R59)', () => {
  it(`R36, R54, R59: em ${String(MATCHES)} partidas geradas, todo quadro × todo jogador × todo momento`, () => {
    let checked = 0;
    let granted = 0;
    for (let seed = 1; seed <= MATCHES; seed++) {
      const { players, spectator, snapshots } = generateMatch(new SeededRng(seed));
      const panelIds = players.flatMap((_p, s) => players.map((_q, r) => panelIdOf(r, s)));
      for (const { label, match } of snapshots) {
        for (const viewer of [...players, spectator]) {
          for (const panelId of [...panelIds, 'PAINEL-inventado']) {
            const expected = mayAccess(match, viewer, panelId);
            expect(
              canAccessPanel(match, viewer, panelId),
              `seed ${String(seed)}, ${label}, ${viewer}, ${panelId}`,
            ).toBe(expected);
            checked++;
            if (expected) granted++;
          }
        }
      }
      expect(canAccessPanel(null, players[0] ?? '', panelIdOf(0, 0))).toBe(false);
    }
    // Both answers happen often: the matrix is not trivially all "no".
    expect(checked).toBeGreaterThan(10_000);
    expect(granted).toBeGreaterThan(500);
  });
});
