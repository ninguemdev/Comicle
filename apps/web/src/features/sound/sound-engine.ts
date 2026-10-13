import {
  SOUNDS,
  type NoiseLayer,
  type SoundId,
  type SoundLayer,
  type ToneLayer,
} from './sound-catalog';

// Plays the catalog with the Web Audio API (docs/sons.md §1, §5). The only sound file that
// touches the browser; tests pass a fake context.

/** The parts of the Web Audio API the engine uses; real `AudioContext`s satisfy them. */
export interface SoundParam {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
}

export interface SoundNode {
  connect(destination: SoundNode): unknown;
}

export interface SoundGain extends SoundNode {
  readonly gain: SoundParam;
}

export interface SoundOscillator extends SoundNode {
  type: OscillatorType;
  readonly frequency: SoundParam;
  start(when: number): void;
  stop(when: number): void;
}

export interface SoundFilter extends SoundNode {
  type: BiquadFilterType;
  readonly frequency: SoundParam;
  readonly Q: SoundParam;
}

export interface SoundBuffer {
  getChannelData(channel: number): Float32Array;
}

export interface SoundBufferSource extends SoundNode {
  buffer: SoundBuffer | null;
  start(when: number): void;
  stop(when: number): void;
}

export interface SoundContext {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  readonly destination: SoundNode;
  resume(): Promise<void>;
  createGain(): SoundGain;
  createOscillator(): SoundOscillator;
  createBiquadFilter(): SoundFilter;
  createBufferSource(): SoundBufferSource;
  createBuffer(channels: number, length: number, sampleRate: number): SoundBuffer;
}

export interface SoundEngine {
  /** Plays a sound now; silently does nothing before the first gesture or without Web Audio. */
  play(id: SoundId): void;
  /** Master level, 0–1, after the volume curve (`masterLevel`). */
  setLevel(level: number): void;
  /** Creates (or wakes up) the audio context; browsers only allow it inside a user gesture. */
  unlock(): void;
}

/** The loudest the master gain goes: the recipes add up, and a game should not shout. */
const MASTER_CEILING = 0.8;
/** Exponential ramps cannot reach 0; this is silence for the ear. */
const SILENCE = 0.0001;
const ATTACK_SECONDS = 0.005;
/** Oscillators stop a little after the envelope, so nothing is cut while still audible. */
const TAIL_SECONDS = 0.02;
const NOISE_SECONDS = 1;

/**
 * Master gain for a volume (0–1) and the mute switch. Quadratic, because loudness is heard
 * roughly logarithmically: a linear slider would do almost nothing in its upper half.
 */
export function masterLevel(volume: number, muted: boolean): number {
  if (muted) {
    return 0;
  }
  const clamped = Math.min(Math.max(volume, 0), 1);
  return MASTER_CEILING * clamped * clamped;
}

/** Quick attack, exponential fade to silence by the end of the layer. */
function envelope(ctx: SoundContext, layer: SoundLayer, at: number, output: SoundNode): SoundGain {
  const amp = ctx.createGain();
  const end = at + layer.duration;
  amp.gain.setValueAtTime(SILENCE, at);
  amp.gain.exponentialRampToValueAtTime(layer.gain, at + ATTACK_SECONDS);
  amp.gain.exponentialRampToValueAtTime(SILENCE, end);
  amp.connect(output);
  return amp;
}

function playTone(ctx: SoundContext, layer: ToneLayer, at: number, output: SoundNode): void {
  const oscillator = ctx.createOscillator();
  const end = at + layer.duration;
  oscillator.type = layer.wave;
  oscillator.frequency.setValueAtTime(layer.from, at);
  if (layer.to !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(layer.to, end);
  }
  oscillator.connect(envelope(ctx, layer, at, output));
  oscillator.start(at);
  oscillator.stop(end + TAIL_SECONDS);
}

function playNoise(
  ctx: SoundContext,
  layer: NoiseLayer,
  at: number,
  output: SoundNode,
  noise: SoundBuffer,
): void {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const end = at + layer.duration;
  source.buffer = noise;
  filter.type = layer.filter;
  filter.Q.value = layer.q;
  filter.frequency.setValueAtTime(layer.from, at);
  if (layer.to !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(layer.to, end);
  }
  source.connect(filter);
  filter.connect(envelope(ctx, layer, at, output));
  source.start(at);
  source.stop(end + TAIL_SECONDS);
}

/** One second of white noise, made once per context and reused by every noise layer. */
function whiteNoise(ctx: SoundContext): SoundBuffer {
  const length = Math.round(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    // Audio noise needs no cryptographic quality.
    samples[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

interface Live {
  ctx: SoundContext;
  master: SoundGain;
  noise: SoundBuffer | null;
}

/** `createContext` returns `null` when the browser has no Web Audio: the engine stays silent. */
export function createSoundEngine(createContext: () => SoundContext | null): SoundEngine {
  let live: Live | null = null;
  let level = 0;

  return {
    unlock() {
      if (live) {
        if (live.ctx.state === 'suspended') {
          void live.ctx.resume().catch(() => undefined);
        }
        return;
      }
      const ctx = createContext();
      if (!ctx) {
        return;
      }
      const master = ctx.createGain();
      master.gain.value = level;
      master.connect(ctx.destination);
      live = { ctx, master, noise: null };
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
    },

    setLevel(next) {
      level = next;
      live?.master.gain.setValueAtTime(next, live.ctx.currentTime);
    },

    play(id) {
      // Nothing queues: a sound that cannot play now is simply skipped (docs/sons.md §5).
      if (!live || live.ctx.state !== 'running' || level === 0) {
        return;
      }
      const { ctx, master } = live;
      const now = ctx.currentTime;
      for (const layer of SOUNDS[id]) {
        const at = now + layer.start;
        if (layer.kind === 'tone') {
          playTone(ctx, layer, at, master);
        } else {
          live.noise ??= whiteNoise(ctx);
          playNoise(ctx, layer, at, master, live.noise);
        }
      }
    },
  };
}

function browserContext(): SoundContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
    return null;
  }
  try {
    return new window.AudioContext();
  } catch {
    return null;
  }
}

export const soundEngine = createSoundEngine(browserContext);

/**
 * Events that count as a user gesture for audio. A touch only counts when the finger lifts
 * (`pointerup`, `touchend`), a mouse already when pressed; `click` covers the rest, including
 * keyboard activation of a button.
 */
const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const;

/**
 * Unlocks the engine on every user gesture (the first one creates the context; later ones wake
 * it up if the browser suspended it). Returns the cleanup.
 */
export function unlockOnGestures(engine: SoundEngine, target: EventTarget): () => void {
  const unlock = () => {
    engine.unlock();
  };
  const options = { capture: true, passive: true };
  for (const type of GESTURE_EVENTS) {
    target.addEventListener(type, unlock, options);
  }
  return () => {
    for (const type of GESTURE_EVENTS) {
      target.removeEventListener(type, unlock, options);
    }
  };
}
