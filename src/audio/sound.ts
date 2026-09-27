/** All game audio, synthesized with WebAudio. No sample files. */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private subGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private muted = false;

  /** Call from a click or key press. Browsers block audio before that. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    const noise = this.noiseSource(ctx, true);
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 120;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    noise.connect(this.engineFilter).connect(this.engineGain).connect(this.master);

    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.value = 38;
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 90;
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    sub.connect(subFilter).connect(this.subGain).connect(this.master);
    sub.start();

    const wind = this.noiseSource(ctx, false);
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 900;
    windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(windFilter).connect(this.windGain).connect(this.master);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.03);
    }
  }

  /** Continuous engine and airflow levels, 0..1 each. */
  setFlight(engine: number, wind: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain || !this.engineFilter || !this.subGain || !this.windGain) return;
    const now = ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(engine * 0.55, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(110 + engine * 620, now, 0.1);
    this.subGain.gain.setTargetAtTime(engine * 0.22, now, 0.08);
    this.windGain.gain.setTargetAtTime(wind * 0.16, now, 0.15);
  }

  beep(frequency = 880, seconds = 0.09, level = 0.12): void {
    this.tone(frequency, seconds, level, 'square', 0);
  }

  chime(): void {
    this.tone(660, 0.12, 0.12, 'triangle', 0);
    this.tone(990, 0.2, 0.12, 'triangle', 0.1);
  }

  warn(): void {
    this.tone(220, 0.16, 0.1, 'sawtooth', 0);
    this.tone(196, 0.16, 0.1, 'sawtooth', 0.18);
  }

  fanfare(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 0.12, 'triangle', i * 0.13));
  }

  /** Arms closing on the booster. */
  clang(): void {
    [180, 433, 671, 1130].forEach((f, i) => this.tone(f, 0.7 - i * 0.12, 0.1, 'sine', 0));
    this.burst(0.18, 2400, 0.25);
  }

  thump(): void {
    this.tone(70, 0.4, 0.3, 'sine', 0);
    this.burst(0.3, 700, 0.3);
  }

  explosion(): void {
    this.tone(55, 1.2, 0.4, 'sine', 0);
    this.burst(1.8, 900, 0.7);
  }

  private tone(
    frequency: number,
    seconds: number,
    level: number,
    type: OscillatorType,
    delay: number
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  private burst(seconds: number, cutoff: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx, false, seconds);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  private noiseBuffer(ctx: AudioContext, brown: boolean, seconds: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  private noiseSource(ctx: AudioContext, brown: boolean): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx, brown, 2);
    source.loop = true;
    source.start();
    return source;
  }
}
