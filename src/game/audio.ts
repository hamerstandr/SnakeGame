type OscType = OscillatorType;

class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  unlock() {
    this.ensure();
  }

  private tone(freq: number, dur: number, type: OscType, vol: number, delay = 0, slideTo?: number) {
    if (this.muted) return;
    const c = this.ensure();
    if (!c) return;
    try {
      const t = c.currentTime + delay;
      const o = c.createOscillator();
      const gn = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      gn.gain.setValueAtTime(vol, t);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch {
      /* ignore */
    }
  }

  eat() {
    this.tone(540, 0.08, 'square', 0.045);
    this.tone(810, 0.11, 'square', 0.04, 0.05);
  }

  bonus() {
    [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.055, i * 0.07));
  }

  die() {
    this.tone(300, 0.5, 'sawtooth', 0.06, 0, 55);
    this.tone(150, 0.62, 'square', 0.045, 0.06, 38);
  }

  start() {
    this.tone(440, 0.09, 'square', 0.045);
    this.tone(660, 0.13, 'square', 0.045, 0.09);
  }

  ui() {
    this.tone(430, 0.06, 'triangle', 0.04);
  }

  pause() {
    this.tone(330, 0.08, 'sine', 0.045);
    this.tone(220, 0.1, 'sine', 0.04, 0.07);
  }

  record() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.06, i * 0.09));
  }
}

export const sfx = new Sfx();
