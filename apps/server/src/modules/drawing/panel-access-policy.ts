import { assignedStory, type Match, type PanelMeta } from '../matches/match';
import { isPanelRevealed } from '../presentation/presentation-cursor';

// Who may see which panel image (R59). Pure; with buildPlayerView, the only place that decides it.

/**
 * R36, R47: while reading, a participant who has not confirmed sees every earlier panel of the
 * story they received this round; after `round:ready`, nothing more.
 */
export function readablePanels(match: Match, playerId: string): readonly PanelMeta[] {
  if (match.phase !== 'round_reading' || match.round === null || match.round.ready.has(playerId)) {
    return [];
  }
  return assignedStory(match, playerId)?.panels ?? [];
}

/** R53, R54: the revealed panels of the story being presented, the same for every member. */
export function presentedPanels(match: Match): readonly PanelMeta[] {
  const cursor = match.presentation;
  if (match.phase !== 'presentation' || cursor === null) {
    return [];
  }
  const story = match.stories[cursor.storyIndex];
  return (story?.panels ?? []).filter((panel) =>
    isPanelRevealed(cursor, cursor.storyIndex, panel.position),
  );
}

/** R54: a revealed panel of any story, for every member of the room. */
function isPresented(match: Match, panelId: string): boolean {
  const cursor = match.presentation;
  if (cursor === null) {
    return false;
  }
  return match.stories.some((story, storyIndex) =>
    story.panels.some(
      (panel) => panel.id === panelId && isPanelRevealed(cursor, storyIndex, panel.position),
    ),
  );
}

/** R59: outside the player's own reading and the presentation, no panel is accessible. */
export function canAccessPanel(match: Match | null, playerId: string, panelId: string): boolean {
  if (match === null) {
    return false;
  }
  switch (match.phase) {
    case 'round_reading':
      return readablePanels(match, playerId).some((panel) => panel.id === panelId);
    case 'theme_writing':
    case 'round_drawing':
    case 'round_closing':
      return false;
    case 'presentation':
      return isPresented(match, panelId);
    default:
      return match.phase satisfies never;
  }
}
