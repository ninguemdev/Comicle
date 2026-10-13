import { describe, expect, it, vi } from 'vitest';

import { SOUNDS } from './sound-catalog';
import {
  createSoundEngine,
  masterLevel,
  unlockOnGestures,
  type SoundBuffer,
  type SoundBufferSource,
  type SoundContext,
  type SoundFilter,
  type SoundGain,
  type SoundNode,
  type SoundOscillator,
  type SoundParam,
} from './sound-engine';

// A Web Audio context that records what the engine builds, so no real audio is needed.

interface RecordingParam extends SoundParam {
  readonly calls: string[];
}

function param(): RecordingParam {
  const calls: string[] = [];
  return {
    value: 0,
    calls,
    setValueAtTime(value, time) {
      calls.push(`set ${String(value)} @${String(time)}`);
    },
    exponentialRampToValueAtTime(value, time) {
      calls.push(`ramp ${String(value)} @${String(time)}`);
    },
  };
}

const connect = () => undefined;

class FakeContext implements SoundContext {
  currentTime = 10;
  readonly sampleRate = 100;
  state = 'running';
  readonly destination: SoundNode = { connect };
  readonly gains: (SoundGain & { gain: RecordingParam })[] = [];
  oscillators = 0;
  noiseSources = 0;
  buffers = 0;
  resumed = 0;

  resume(): Promise<void> {
    this.resumed++;
    this.state = 'running';
    return Promise.resolve();
  }

  createGain(): SoundGain {
    const node = { gain: param(), connect };
    this.gains.push(node);
    return node;
  }

  createOscillator(): SoundOscillator {
    this.oscillators++;
    return { type: 'sine', frequency: param(), connect, start: vi.fn(), stop: vi.fn() };
  }

  createBiquadFilter(): SoundFilter {
    return { type: 'lowpass', frequency: param(), Q: param(), connect };
  }

  createBufferSource(): SoundBufferSource {
    this.noiseSources++;
    return { buffer: null, connect, start: vi.fn(), stop: vi.fn() };
  }

  createBuffer(_channels: number, length: number): SoundBuffer {
    this.buffers++;
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

function engineWithFake() {
  const ctx = new FakeContext();
  const createContext = vi.fn(() => ctx);
  return { ctx, createContext, engine: createSoundEngine(createContext) };
}

describe('masterLevel', () => {
  it('curva quadrática até o teto; silenciar zera', () => {
    expect(masterLevel(0, false)).toBe(0);
    expect(masterLevel(0.5, false)).toBeCloseTo(0.2);
    expect(masterLevel(1, false)).toBeCloseTo(0.8);
    expect(masterLevel(1, true)).toBe(0);
    expect(masterLevel(3, false)).toBeCloseTo(0.8);
  });
});

describe('motor de som', () => {
  it('antes do primeiro gesto não cria contexto nem toca nada', () => {
    const { engine, createContext } = engineWithFake();
    engine.setLevel(0.5);

    engine.play('click');

    expect(createContext).not.toHaveBeenCalled();
  });

  it('o primeiro gesto cria o contexto com o ganho mestre já no volume escolhido', () => {
    const { engine, ctx, createContext } = engineWithFake();
    engine.setLevel(0.3);
    const target = new EventTarget();
    const stop = unlockOnGestures(engine, target);

    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('keydown'));
    stop();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ctx.gains[0]?.gain.value).toBe(0.3);
  });

  it('no celular, o toque conta quando o dedo sobe (touchend), não ao encostar', () => {
    const { engine, createContext } = engineWithFake();
    const target = new EventTarget();
    const stop = unlockOnGestures(engine, target);

    target.dispatchEvent(new Event('touchend'));
    stop();
    target.dispatchEvent(new Event('click'));

    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('cada camada vira um oscilador ou um ruído, com envelope que termina em silêncio', () => {
    const { engine, ctx } = engineWithFake();
    engine.setLevel(0.5);
    engine.unlock();

    engine.play('submit');
    expect(ctx.oscillators).toBe(SOUNDS.submit.length);
    const envelope = ctx.gains[1]?.gain.calls ?? [];
    expect(envelope[0]).toBe('set 0.0001 @10');
    expect(envelope.at(-1)).toBe('ramp 0.0001 @10.3');

    engine.play('tick');
    engine.play('turn');
    expect(ctx.noiseSources).toBe(2);
    // The white noise is made once and reused.
    expect(ctx.buffers).toBe(1);
  });

  it('volume zero, contexto suspenso ou sem Web Audio: nada toca, nada quebra', () => {
    const { engine, ctx } = engineWithFake();
    engine.unlock();
    engine.setLevel(0);
    engine.play('click');
    expect(ctx.oscillators).toBe(0);

    engine.setLevel(0.5);
    ctx.state = 'suspended';
    engine.play('click');
    expect(ctx.oscillators).toBe(0);
    // The next gesture wakes it up.
    engine.unlock();
    expect(ctx.resumed).toBe(1);

    const silent = createSoundEngine(() => null);
    silent.unlock();
    silent.setLevel(1);
    expect(() => {
      silent.play('fanfare');
    }).not.toThrow();
  });

  it('mudar o volume depois do desbloqueio ajusta o ganho mestre na hora', () => {
    const { engine, ctx } = engineWithFake();
    engine.unlock();

    engine.setLevel(0.42);

    expect(ctx.gains[0]?.gain.calls).toEqual(['set 0.42 @10']);
  });
});
