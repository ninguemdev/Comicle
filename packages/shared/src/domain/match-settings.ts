/** `individual` is planned for v2; v1 rejects it (R21). */
export type GameModeId = 'collaborative' | 'individual';

export type PanelCountSetting = { kind: 'per_player' } | { kind: 'fixed'; value: number };

/** R18. */
export interface MatchSettings {
  mode: GameModeId;
  panelCount: PanelCountSetting;
  drawingSeconds: number;
}
