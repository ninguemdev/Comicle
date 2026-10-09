import { assignedStory, type Match, type PanelMeta } from '../matches/match';

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

/** R59: outside the player's own reading (and the presentation, T16), no panel is accessible. */
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
      // R54 arrives with the presentation cursor (T16); until then nothing is revealed.
      return false;
    default:
      return match.phase satisfies never;
  }
}
