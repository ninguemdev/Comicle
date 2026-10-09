import { describe, expect, it } from 'vitest';

import {
  assignedStoryIndex,
  draftOf,
  FALLBACK_THEMES,
  generateMatch,
  panelIdOf,
  themeOf,
} from '../../../test/support/generated-matches';
import { inMatch, testMember, testRoom } from '../../../test/support/room-builders';
import { SeededRng } from '../../platform/random';
import type { Match } from '../matches/match';
import { buildPlayerView } from './build-player-view';

// R58 as a matrix (T19): in generated matches, at every moment and for every player and
// spectator, the PlayerView carries no theme and no panel beyond what the rules allow.

const MATCHES = 30;

/** Every theme-like text and panel ID of the match: what a leak would show. */
function universe(match: Match, players: string[]) {
  const themes = new Set([
    ...players.flatMap((p) => [draftOf(p), themeOf(p)]),
    ...FALLBACK_THEMES,
    ...match.stories.map((story) => story.themeText),
  ]);
  const panels = match.panelIds.flatMap((round, r) => round.map((_id, s) => panelIdOf(r, s)));
  return { themes, panels };
}

/** R54: revealed panels in the presentation, straight from the cursor. */
function presented(match: Match): Set<string> {
  const cursor = match.presentation;
  if (!cursor) return new Set();
  return new Set(
    match.stories.flatMap((story, index) =>
      story.panels
        .filter(
          (panel) =>
            index < cursor.maxStoryReached ||
            (index === cursor.maxStoryReached &&
              panel.position < (cursor.revealedCount[index] ?? 0)),
        )
        .map((panel) => panel.id),
    ),
  );
}

/** What the rules let `viewer` see right now (R28, R36, R38, R49, R53–R55). */
function allowed(match: Match, viewer: string, seated: boolean) {
  const themes = new Set<string>();
  let panels = new Set<string>();
  const story = seated ? assignedStoryIndex(match, viewer) : undefined;
  const assigned = story === undefined ? undefined : match.stories[story];
  switch (match.phase) {
    case 'theme_writing':
      if (seated) {
        themes.add(draftOf(viewer)).add(themeOf(viewer));
      }
      break;
    case 'round_reading':
      if (assigned) {
        themes.add(assigned.themeText);
        if (!match.round?.ready.has(viewer)) {
          panels = new Set(assigned.panels.map((panel) => panel.id));
        }
      }
      break;
    case 'round_drawing':
      if (assigned) themes.add(assigned.themeText);
      break;
    case 'round_closing':
      break;
    case 'presentation': {
      const reached = match.presentation?.maxStoryReached ?? -1;
      match.stories.slice(0, reached + 1).forEach((s) => themes.add(s.themeText));
      panels = presented(match);
      break;
    }
    default:
      return match.phase satisfies never;
  }
  return { themes, panels };
}

describe('matriz de privacidade (R58)', () => {
  it(`R58: em ${String(MATCHES)} partidas geradas, nenhuma view mostra tema ou quadro além do permitido`, () => {
    let checked = 0;
    for (let seed = 1; seed <= MATCHES; seed++) {
      const { players, spectator, snapshots } = generateMatch(new SeededRng(seed));
      const room = testRoom(...[...players, spectator].map((id) => testMember(id)));
      for (const { label, match } of snapshots) {
        inMatch(room, match);
        const leaks = universe(match, players);
        for (const viewer of [...players, spectator]) {
          const json = JSON.stringify(buildPlayerView(room, viewer, 0));
          const permitted = allowed(match, viewer, viewer !== spectator);
          const where = `seed ${String(seed)}, ${label}, ${viewer}`;
          for (const theme of leaks.themes) {
            if (json.includes(theme)) {
              expect(permitted.themes.has(theme), `${where}: tema ${theme}`).toBe(true);
            }
          }
          for (const panel of leaks.panels) {
            if (json.includes(panel)) {
              expect(permitted.panels.has(panel), `${where}: quadro ${panel}`).toBe(true);
            }
          }
          checked++;
        }
      }
    }
    // Enough moments to mean something: every phase of 30 matches, for each viewer.
    expect(checked).toBeGreaterThan(1000);
  });

  it('as partidas geradas passam por todas as fases', () => {
    const phases = new Set<string>();
    for (let seed = 1; seed <= MATCHES; seed++) {
      for (const { match } of generateMatch(new SeededRng(seed)).snapshots) {
        phases.add(match.phase);
      }
    }
    expect([...phases].sort()).toEqual([
      'presentation',
      'round_closing',
      'round_drawing',
      'round_reading',
      'theme_writing',
    ]);
  });
});
