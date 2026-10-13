export type GameModeId = 'collaborative' | 'individual';

export type PanelCountSetting = { kind: 'per_player' } | { kind: 'fixed'; value: number };

/** R18: settings that only the individual mode reads (R62–R64). */
export interface IndividualSettings {
  /** Panels of every story, drawn by a single player. */
  panelsPerStory: number;
  /** Time to draw the whole story, not each panel. */
  storySeconds: number;
}

/**
 * R18. Each mode reads only its own fields; the others are kept so the host does not lose them
 * when switching modes in the lobby.
 */
export interface MatchSettings {
  mode: GameModeId;
  panelCount: PanelCountSetting;
  drawingSeconds: number;
  /** R38: the artist sees the story's earlier panels, small, while drawing. */
  showPreviousPanels: boolean;
  /**
   * R31: on, the author draws the last panel of their own story (with one panel per player);
   * off, the rotation skips the author and "per player" gives one panel less.
   */
  authorDrawsLast: boolean;
  individual: IndividualSettings;
}
