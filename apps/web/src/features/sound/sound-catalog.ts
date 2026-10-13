// The sounds of the game (docs/sons.md §2) as plain data: what to synthesize, not how. Pure: the
// engine turns each layer into Web Audio nodes, and tests read the numbers directly.

export type Waveform = 'sine' | 'square' | 'triangle' | 'sawtooth';

/** An oscillator; its pitch glides from `from` to `to` (Hz) when both are given. */
export interface ToneLayer {
  readonly kind: 'tone';
  readonly wave: Waveform;
  readonly from: number;
  readonly to?: number;
  /** Seconds after the sound starts. */
  readonly start: number;
  readonly duration: number;
  /** Peak level, 0–1, before the master volume. */
  readonly gain: number;
}

/** White noise through a filter whose frequency glides from `from` to `to` (Hz). */
export interface NoiseLayer {
  readonly kind: 'noise';
  readonly filter: 'bandpass' | 'highpass';
  readonly from: number;
  readonly to?: number;
  /** Filter resonance. */
  readonly q: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
}

export type SoundLayer = ToneLayer | NoiseLayer;
export type SoundRecipe = readonly SoundLayer[];

export const SOUND_IDS = [
  'click',
  'toggle',
  'join',
  'leave',
  'start',
  'turn',
  'tick',
  'warning',
  'timeUp',
  'submit',
  'reveal',
  'fanfare',
  'error',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

/** No sound lasts longer than this, in seconds (docs/sons.md §1). */
export const MAX_SOUND_SECONDS = 0.6;

const A4_HZ = 440;
const A4_MIDI = 69;
const SEMITONES = 12;
const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const;
const OFFSETS_BY_LETTER: Readonly<Record<string, number>> = NOTE_OFFSETS;

type NoteName = `${keyof typeof NOTE_OFFSETS}${number}`;

/** Frequency of a natural note in scientific notation, e.g. `note('E5')`. */
export function note(name: NoteName): number {
  const offset = OFFSETS_BY_LETTER[name.charAt(0)] ?? 0;
  const octave = Number(name.slice(1));
  const midi = (octave + 1) * SEMITONES + offset;
  return A4_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES);
}

const tone = (
  wave: Waveform,
  from: number,
  start: number,
  duration: number,
  gain: number,
  to?: number,
): ToneLayer => ({
  kind: 'tone',
  wave,
  from,
  start,
  duration,
  gain,
  ...(to === undefined ? {} : { to }),
});

/** Notes one after the other, `step` seconds apart, each lasting `length`. */
function arpeggio(
  wave: Waveform,
  notes: readonly number[],
  step: number,
  length: number,
  gain: number,
): ToneLayer[] {
  return notes.map((frequency, index) => tone(wave, frequency, index * step, length, gain));
}

export const SOUNDS: Readonly<Record<SoundId, SoundRecipe>> = {
  click: [tone('sine', 1200, 0, 0.04, 0.5)],
  toggle: [tone('sine', 900, 0, 0.035, 0.4), tone('sine', 1300, 0.045, 0.035, 0.4)],
  join: arpeggio('triangle', [note('E5'), note('B5')], 0.09, 0.13, 0.45),
  leave: arpeggio('triangle', [note('B5'), note('E5')], 0.09, 0.13, 0.4),
  start: arpeggio('square', [note('C5'), note('E5'), note('G5'), note('C6')], 0.09, 0.18, 0.12),
  turn: [
    {
      kind: 'noise',
      filter: 'bandpass',
      from: 400,
      to: 2400,
      q: 1.2,
      start: 0,
      duration: 0.35,
      gain: 0.5,
    },
  ],
  tick: [
    { kind: 'noise', filter: 'highpass', from: 3000, q: 0.7, start: 0, duration: 0.03, gain: 0.35 },
  ],
  warning: [tone('square', 880, 0, 0.1, 0.15), tone('square', 880, 0.15, 0.11, 0.15)],
  timeUp: [tone('sawtooth', 660, 0, 0.5, 0.12, 220)],
  submit: [note('G5'), note('B5'), note('D6')].map((frequency) =>
    tone('sine', frequency, 0, 0.3, 0.25),
  ),
  reveal: [tone('sine', 1600, 0, 0.12, 0.5, 400)],
  fanfare: [
    ...arpeggio('square', [note('C5'), note('E5'), note('G5')], 0.045, 0.09, 0.1),
    ...[note('C5'), note('E5'), note('G5'), note('C6')].map((frequency) =>
      tone('triangle', frequency, 0.15, 0.45, 0.2),
    ),
  ],
  error: arpeggio('square', [note('A3'), note('F3')], 0.11, 0.13, 0.15),
};

/** When the last layer of a recipe ends, in seconds. */
export function recipeDuration(recipe: SoundRecipe): number {
  return Math.max(0, ...recipe.map((layer) => layer.start + layer.duration));
}
