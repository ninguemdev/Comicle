import {
  DRAWING_SECONDS_DEFAULT,
  DRAWING_SECONDS_OPTIONS,
  FIXED_PANEL_COUNT_DEFAULT,
  FIXED_PANEL_COUNT_MAX,
  FIXED_PANEL_COUNT_MIN,
  type MatchSettings,
  type PanelCountSetting,
} from '@comicle/shared';
import { useId } from 'react';

import type { SettingsInput } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Card } from '../../ui/card';

const texts = strings.room.settings;

const FIXED_COUNTS = Array.from(
  { length: FIXED_PANEL_COUNT_MAX - FIXED_PANEL_COUNT_MIN + 1 },
  (_, index) => FIXED_PANEL_COUNT_MIN + index,
);

/** The view carries any number; the server only takes the R18 options. */
function drawingSecondsOf(settings: MatchSettings): SettingsInput['drawingSeconds'] {
  return (
    DRAWING_SECONDS_OPTIONS.find((option) => option === settings.drawingSeconds) ??
    DRAWING_SECONDS_DEFAULT
  );
}

function panelCountText(panelCount: PanelCountSetting): string {
  return panelCount.kind === 'fixed' ? texts.panels(panelCount.value) : texts.perPlayer;
}

const SELECT_CLASSES = 'min-h-11 rounded-lg border-comic bg-paper px-3 font-bold';
const LEGEND_CLASSES = 'mb-1 font-display text-xl tracking-wide';

interface EditorProps {
  settings: MatchSettings;
  onChange: (settings: SettingsInput) => void;
}

/** R11, R18–R21: the host's controls. */
function SettingsEditor({ settings, onChange }: EditorProps) {
  const ids = { fixedValue: useId(), drawing: useId() };
  const drawingSeconds = drawingSecondsOf(settings);
  const change = (patch: Partial<SettingsInput>) => {
    onChange({ mode: 'collaborative', panelCount: settings.panelCount, drawingSeconds, ...patch });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className={LEGEND_CLASSES}>{texts.panelCount}</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="radio"
              name="panel-count"
              checked={settings.panelCount.kind === 'per_player'}
              onChange={() => {
                change({ panelCount: { kind: 'per_player' } });
              }}
              className="size-5 accent-ink"
            />
            {texts.perPlayer}
            <span className="text-sm font-normal text-muted">{texts.perPlayerHint}</span>
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="radio"
              name="panel-count"
              checked={settings.panelCount.kind === 'fixed'}
              onChange={() => {
                change({ panelCount: { kind: 'fixed', value: FIXED_PANEL_COUNT_DEFAULT } });
              }}
              className="size-5 accent-ink"
            />
            {texts.fixed}
          </label>
          {settings.panelCount.kind === 'fixed' && (
            <div className="flex items-center gap-3 pl-7">
              <label htmlFor={ids.fixedValue} className="text-sm font-semibold">
                {texts.fixedValue}
              </label>
              <select
                id={ids.fixedValue}
                value={settings.panelCount.value}
                onChange={(event) => {
                  change({ panelCount: { kind: 'fixed', value: Number(event.target.value) } });
                }}
                className={SELECT_CLASSES}
              >
                {FIXED_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.drawing} className={LEGEND_CLASSES}>
          {texts.drawingSeconds}
        </label>
        <select
          id={ids.drawing}
          value={drawingSeconds}
          onChange={(event) => {
            const chosen = DRAWING_SECONDS_OPTIONS.find(
              (option) => option === Number(event.target.value),
            );
            if (chosen !== undefined) {
              change({ drawingSeconds: chosen });
            }
          }}
          className={`${SELECT_CLASSES} self-start`}
        >
          {DRAWING_SECONDS_OPTIONS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {texts.duration(seconds)}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={LEGEND_CLASSES}>{texts.mode}</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-semibold">
            <input type="radio" name="mode" checked readOnly className="size-5 accent-ink" />
            {texts.collaborative}
          </label>
          {/* R21: shown as coming soon, never selectable in v1. */}
          <label className="flex items-center gap-2 font-semibold text-muted">
            <input type="radio" name="mode" disabled className="size-5" />
            {texts.individual}
            <span className="rounded-full border-2 border-ink bg-pop-yellow px-2 text-xs">
              {texts.soon}
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

/** Read-only summary for everyone but the host, updated live with each view. */
function SettingsSummary({ settings }: { settings: MatchSettings }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="font-semibold text-muted">{texts.panelCount}</dt>
        <dd className="font-bold">{panelCountText(settings.panelCount)}</dd>
        <dt className="font-semibold text-muted">{texts.drawingSeconds}</dt>
        <dd className="font-bold">{texts.duration(settings.drawingSeconds)}</dd>
        <dt className="font-semibold text-muted">{texts.mode}</dt>
        <dd className="font-bold">{texts.collaborative}</dd>
      </dl>
      <p className="text-sm text-muted">{texts.hostOnly}</p>
    </div>
  );
}

export interface SettingsPanelProps {
  settings: MatchSettings;
  editable: boolean;
  onChange: (settings: SettingsInput) => void;
}

export function SettingsPanel({ settings, editable, onChange }: SettingsPanelProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-3xl tracking-wide">{texts.title}</h2>
      {editable ? (
        <SettingsEditor settings={settings} onChange={onChange} />
      ) : (
        <SettingsSummary settings={settings} />
      )}
    </Card>
  );
}
