/** `individual` is planned for v2; v1 rejects it (R21). */
export type GameModeId = 'collaborative' | 'individual';

export type PanelCountSetting = { kind: 'per_player' } | { kind: 'fixed'; value: number };

/** R18. */
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
}
