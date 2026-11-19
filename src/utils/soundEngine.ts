class PixelSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private bgmPlaying = false;
  private bgmTimer: number | null = null;
  private stepIdx = 0;

  private ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (val) {
      this.ensureContext();
    } else {
      this.stopBgm();
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  public isBgmPlaying() {
    return this.bgmPlaying;
  }

  public playHover() {
    if (!this.enabled) return;
    this.playTone(620, 0.04, 'triangle', 0.03);
  }

  public playClick() {
    if (!this.enabled) return;
    this.playTone(440, 0.06, 'sine', 0.06, 580);
  }

  public playOpenPanel() {
    if (!this.enabled) return;
    this.playTone(392, 0.08, 'triangle', 0.05);
    setTimeout(() => this.playTone(523.25, 0.11, 'triangle', 0.05), 55);
  }

  public playLamp() {
    if (!this.enabled) return;
    this.playTone(220, 0.035, 'square', 0.04, 150);
  }

  public playType() {
    if (!this.enabled) return;
    this.playTone(740, 0.018, 'square', 0.015);
  }

  public playFrog() {
    if (!this.enabled) return;
    this.playTone(190, 0.08, 'sawtooth', 0.05, 290);
    setTimeout(() => this.playTone(230, 0.09, 'sawtooth', 0.04, 340), 90);
  }

  public playPurr() {
    if (!this.enabled) return;
    this.playTone(110, 0.25, 'sine', 0.04, 96);
  }

  public toggleBgm(): boolean {
    if (this.bgmPlaying) {
      this.stopBgm();
      return false;
    }
    if (!this.enabled) {
      this.enabled = true;
    }
    this.ensureContext();
    this.bgmPlaying = true;
    this.stepIdx = 0;

    // Gentle lo-fi Fmaj7 -> Em7 -> Dm7 -> Cmaj7 progression
    const chords = [
      [174.61, 220.0, 261.63, 329.63],
      [164.81, 196.0, 246.94, 293.66],
      [146.83, 174.61, 220.0, 261.63],
      [130.81, 164.81, 196.0, 246.94],
    ];

    const playChord = () => {
      if (!this.bgmPlaying || !this.ctx) return;
      const chord = chords[this.stepIdx % chords.length];
      chord.forEach((freq, i) => {
        setTimeout(() => {
          if (this.bgmPlaying) this.playTone(freq, 1.5, 'sine', 0.022);
        }, i * 45);
      });
      this.stepIdx++;
    };

    playChord();
    this.bgmTimer = window.setInterval(playChord, 2000);
    return true;
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainVal: number,
    slideTo?: number
  ) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

export const soundEngine = new PixelSoundEngine();
