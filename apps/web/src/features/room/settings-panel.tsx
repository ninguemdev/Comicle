import {
  DRAWING_SECONDS_DEFAULT,
  DRAWING_SECONDS_OPTIONS,
  FIXED_PANEL_COUNT_DEFAULT,
  FIXED_PANEL_COUNT_MAX,
  FIXED_PANEL_COUNT_MIN,
  INDIVIDUAL_PANEL_COUNT_MAX,
  INDIVIDUAL_PANEL_COUNT_MIN,
  STORY_SECONDS_DEFAULT,
  STORY_SECONDS_OPTIONS,
  type GameModeId,
  type MatchSettings,
  type PanelCountSetting,
} from '@comicle/shared';
import { useId } from 'react';

import type { SettingsInput } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Card } from '../../ui/card';
import { soundEngine } from '../sound/sound-engine';

const texts = strings.room.settings;

const FIXED_COUNTS = Array.from(
  { length: FIXED_PANEL_COUNT_MAX - FIXED_PANEL_COUNT_MIN + 1 },
  (_, index) => FIXED_PANEL_COUNT_MIN + index,
);

const INDIVIDUAL_COUNTS = Array.from(
  { length: INDIVIDUAL_PANEL_COUNT_MAX - INDIVIDUAL_PANEL_COUNT_MIN + 1 },
  (_, index) => INDIVIDUAL_PANEL_COUNT_MIN + index,
);

const MODES: readonly GameModeId[] = ['collaborative', 'individual'];

/** The view carries any number; the server only takes the R18 options. */
function drawingSecondsOf(settings: MatchSettings): SettingsInput['drawingSeconds'] {
  return (
    DRAWING_SECONDS_OPTIONS.find((option) => option === settings.drawingSeconds) ??
    DRAWING_SECONDS_DEFAULT
  );
}

/** Same for the individual mode's settings, which this editor carries along unchanged. */
function individualOf(settings: MatchSettings): SettingsInput['individual'] {
  const { panelsPerStory, storySeconds } = settings.individual;
  return {
    panelsPerStory,
    storySeconds:
      STORY_SECONDS_OPTIONS.find((option) => option === storySeconds) ?? STORY_SECONDS_DEFAULT,
  };
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
  const drawingSeconds = drawingSecondsOf(settings);
  const change = (patch: Partial<SettingsInput>) => {
    onChange({
      mode: settings.mode,
      panelCount: settings.panelCount,
      drawingSeconds,
      showPreviousPanels: settings.showPreviousPanels,
      authorDrawsLast: settings.authorDrawsLast,
      individual: individualOf(settings),
      ...patch,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className={LEGEND_CLASSES}>{texts.mode}</legend>
        <div className="flex flex-col gap-2">
          {MODES.map((mode) => (
            <label key={mode} className="flex items-start gap-2 font-semibold">
              <input
                type="radio"
                name="mode"
                checked={settings.mode === mode}
                onChange={() => {
                  change({ mode });
                }}
                className="mt-0.5 size-5 shrink-0 accent-ink"
              />
              <span className="flex flex-col">
                {texts.modes[mode].name}
                <span className="text-sm font-normal text-muted">{texts.modes[mode].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {settings.mode === 'individual' ? (
        <IndividualFields
          individual={individualOf(settings)}
          onChange={(individual) => {
            change({ individual });
          }}
        />
      ) : (
        <CollaborativeFields settings={settings} drawingSeconds={drawingSeconds} change={change} />
      )}
    </div>
  );
}

interface CollaborativeFieldsProps {
  settings: MatchSettings;
  drawingSeconds: SettingsInput['drawingSeconds'];
  change: (patch: Partial<SettingsInput>) => void;
}

/** R18–R20, R31, R38: what only the collaborative mode reads. */
function CollaborativeFields({ settings, drawingSeconds, change }: CollaborativeFieldsProps) {
  const ids = { fixedValue: useId(), drawing: useId() };
  return (
    <>
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
            <span className="text-sm font-normal text-muted">
              {settings.authorDrawsLast ? texts.perPlayerHint : texts.perPlayerHintWithoutAuthor}
            </span>
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

      <label className="flex items-start gap-2 font-semibold">
        <input
          type="checkbox"
          checked={settings.authorDrawsLast}
          onChange={(event) => {
            soundEngine.play('toggle');
            change({ authorDrawsLast: event.target.checked });
          }}
          className="mt-0.5 size-5 shrink-0 accent-ink"
        />
        <span className="flex flex-col">
          {texts.authorDrawsLast}
          <span className="text-sm font-normal text-muted">{texts.authorDrawsLastHint}</span>
        </span>
      </label>

      <label className="flex items-start gap-2 font-semibold">
        <input
          type="checkbox"
          checked={settings.showPreviousPanels}
          onChange={(event) => {
            soundEngine.play('toggle');
            change({ showPreviousPanels: event.target.checked });
          }}
          className="mt-0.5 size-5 shrink-0 accent-ink"
        />
        <span className="flex flex-col">
          {texts.showPreviousPanels}
          <span className="text-sm font-normal text-muted">{texts.showPreviousPanelsHint}</span>
        </span>
      </label>
    </>
  );
}

interface IndividualFieldsProps {
  individual: SettingsInput['individual'];
  onChange: (individual: SettingsInput['individual']) => void;
}

/** R18, R62, R65: panels per story and the time for the whole story. */
function IndividualFields({ individual, onChange }: IndividualFieldsProps) {
  const ids = { panels: useId(), seconds: useId() };
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.panels} className={LEGEND_CLASSES}>
          {texts.panelsPerStory}
        </label>
        <select
          id={ids.panels}
          value={individual.panelsPerStory}
          onChange={(event) => {
            onChange({ ...individual, panelsPerStory: Number(event.target.value) });
          }}
          className={`${SELECT_CLASSES} self-start`}
        >
          {INDIVIDUAL_COUNTS.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.seconds} className={LEGEND_CLASSES}>
          {texts.storySeconds}
        </label>
        <select
          id={ids.seconds}
          value={individual.storySeconds}
          onChange={(event) => {
            const chosen = STORY_SECONDS_OPTIONS.find(
              (option) => option === Number(event.target.value),
            );
            if (chosen !== undefined) {
              onChange({ ...individual, storySeconds: chosen });
            }
          }}
          className={`${SELECT_CLASSES} self-start`}
        >
          {STORY_SECONDS_OPTIONS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {texts.duration(seconds)}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{texts.storySecondsHint}</span>
      </div>
    </>
  );
}

/** Read-only summary for everyone but the host, updated live with each view. */
function SettingsSummary({ settings }: { settings: MatchSettings }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="font-semibold text-muted">{texts.mode}</dt>
        <dd className="font-bold">{texts.modes[settings.mode].name}</dd>
        {settings.mode === 'individual' ? (
          <>
            <dt className="font-semibold text-muted">{texts.panelsPerStory}</dt>
            <dd className="font-bold">{texts.panels(settings.individual.panelsPerStory)}</dd>
            <dt className="font-semibold text-muted">{texts.storySeconds}</dt>
            <dd className="font-bold">{texts.duration(settings.individual.storySeconds)}</dd>
          </>
        ) : (
          <>
            <dt className="font-semibold text-muted">{texts.panelCount}</dt>
            <dd className="font-bold">{panelCountText(settings.panelCount)}</dd>
            <dt className="font-semibold text-muted">{texts.drawingSeconds}</dt>
            <dd className="font-bold">{texts.duration(settings.drawingSeconds)}</dd>
            <dt className="font-semibold text-muted">{texts.authorDrawsLast}</dt>
            <dd className="font-bold">{settings.authorDrawsLast ? texts.yes : texts.no}</dd>
            <dt className="font-semibold text-muted">{texts.showPreviousPanels}</dt>
            <dd className="font-bold">{settings.showPreviousPanels ? texts.yes : texts.no}</dd>
          </>
        )}
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
