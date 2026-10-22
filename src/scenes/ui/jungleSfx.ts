/**
 * Original Jungle Ball sound effects, synthesised in code with Web Audio (no audio files).
 * Off when the browser has no Web Audio, when `?mute` is in the URL, or when localStorage `smr-sound` is `off`.
 * The context starts on the first user gesture (iOS needs one) and is closed when the scene shuts down.
 */
export type SfxKind = 'hit' | 'big' | 'slide' | 'shot' | 'charged' | 'post' | 'save' | 'goal' | 'whistle';

export class JungleSfx {
  private ctx: AudioContext | null = null;
  private readonly enabled: boolean;

  constructor() {
    let off = false;
    try {
      off = new URLSearchParams(window.location.search).has('mute') || window.localStorage.getItem('smr-sound') === 'off';
    } catch {
      off = true;
    }
    this.enabled = !off && typeof window.AudioContext === 'function';
  }

  /** Call from a pointer/key handler: creates or resumes the context inside the gesture. */
  unlock(): void {
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  play(kind: SfxKind): void {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    const tone = (f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0): void => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + delay);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur);
      g.gain.setValueAtTime(vol, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(g).connect(c.destination);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.02);
    };
    const noise = (dur: number, vol: number, freq: number): void => {
      const n = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      let seed = 1234567;
      for (let i = 0; i < n; i++) (seed = (seed * 1103515245 + 12345) & 0x7fffffff), (d[i] = ((seed / 0x7fffffff) * 2 - 1) * (1 - i / n));
      const src = c.createBufferSource();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      src.buffer = buf;
      f.type = 'lowpass';
      f.frequency.value = freq;
      g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination);
      src.start(t);
    };
    switch (kind) {
      case 'hit': return tone(180, 60, 0.15, 'square', 0.18), noise(0.08, 0.25, 900);
      case 'big': return tone(140, 40, 0.3, 'square', 0.25), noise(0.18, 0.4, 700);
      case 'slide': return noise(0.3, 0.2, 1800);
      case 'shot': return tone(320, 120, 0.1, 'triangle', 0.25), noise(0.05, 0.2, 2500);
      case 'charged': return tone(420, 90, 0.18, 'sawtooth', 0.2), noise(0.08, 0.3, 3000);
      case 'post': return tone(1250, 1180, 0.35, 'sine', 0.2), tone(1870, 1800, 0.25, 'sine', 0.1);
      case 'save': return tone(220, 160, 0.12, 'triangle', 0.25), noise(0.06, 0.2, 1200);
      case 'goal': return tone(523, 523, 0.14, 'square', 0.12), tone(659, 659, 0.14, 'square', 0.12, 0.12), tone(784, 784, 0.3, 'square', 0.12, 0.24);
      case 'whistle': return tone(2200, 2100, 0.35, 'sine', 0.12);
    }
  }

  destroy(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
