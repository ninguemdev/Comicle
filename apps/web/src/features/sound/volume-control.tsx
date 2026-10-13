import { useId, useRef } from 'react';

import { useSoundStore } from '../../stores/sound-store';
import { strings } from '../../strings/pt-BR';
import { SpeakerIcon, SpeakerOffIcon } from '../../ui/icons';
import { soundEngine } from './sound-engine';

const texts = strings.sound;
const PERCENT = 100;
const STEP_PERCENT = 5;
/** Dragging fires many changes; the preview plays at most this often, in ms. */
const PREVIEW_INTERVAL_MS = 150;

function toPercent(volume: number): number {
  return Math.round(volume * PERCENT);
}

/** Mute switch and volume slider for the whole site (docs/sons.md §4), remembered per browser. */
export function VolumeControl() {
  const volume = useSoundStore((state) => state.volume);
  const muted = useSoundStore((state) => state.muted);
  const actions = useSoundStore((state) => state.actions);
  const sliderId = useId();
  const lastPreview = useRef(0);
  const percent = toPercent(volume);

  /** A click at the new level, so the player hears what they chose. */
  function preview(): void {
    const now = performance.now();
    if (now - lastPreview.current >= PREVIEW_INTERVAL_MS) {
      lastPreview.current = now;
      soundEngine.play('click');
    }
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <legend className="float-left mr-1 font-bold">{texts.label}</legend>
      <button
        type="button"
        aria-pressed={muted}
        aria-label={texts.mute}
        title={muted ? texts.unmute : texts.mute}
        onClick={() => {
          actions.toggleMuted();
          preview();
        }}
        className={`flex size-11 items-center justify-center rounded-lg border-comic ${
          muted ? 'bg-pop-yellow text-night' : 'bg-paper'
        }`}
      >
        {muted ? <SpeakerOffIcon /> : <SpeakerIcon />}
      </button>
      <label htmlFor={sliderId} className="sr-only">
        {texts.volume}
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={PERCENT}
        step={STEP_PERCENT}
        value={percent}
        aria-valuetext={texts.volumeValue(percent)}
        onChange={(event) => {
          actions.setVolume(Number(event.target.value) / PERCENT);
          preview();
        }}
        className={`h-8 w-40 cursor-pointer accent-pop-blue ${muted ? 'opacity-50' : ''}`}
      />
      <span aria-hidden="true" className="w-12 text-right font-bold tabular-nums">
        {texts.volumeValue(percent)}
      </span>
    </fieldset>
  );
}
