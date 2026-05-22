/**
 * Astro Bowl VR — Procedural Audio System
 * Ball rolling, pin crashes, gutter thud, strike fanfare, spare chime,
 * ambient music — all via Web Audio API.
 */
export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.6;
  private ambientOsc: OscillatorNode[] = [];
  private ambientGains: GainNode[] = [];
  private rollingNoise: AudioBufferSourceNode | null = null;
  private rollingGain: GainNode;
  private rollingFilter: BiquadFilterNode;
  private initialized: boolean = false;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.rollingGain = this.ctx.createGain();
    this.rollingGain.gain.value = 0;
    this.rollingGain.connect(this.sfxGain);

    this.rollingFilter = this.ctx.createBiquadFilter();
    this.rollingFilter.type = 'lowpass';
    this.rollingFilter.frequency.value = 200;
    this.rollingFilter.connect(this.rollingGain);
  }

  async init() {
    if (this.initialized) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.initialized = true;
  }

  /**
   * Start ambient background music — synth pads.
   */
  startAmbientMusic() {
    if (this.ambientOsc.length > 0) return;

    // Deep bass drone
    const bassOsc = this.ctx.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 55; // A1
    const bassGain = this.ctx.createGain();
    bassGain.gain.value = 0.1;
    bassOsc.connect(bassGain);
    bassGain.connect(this.musicGain);
    bassOsc.start();
    this.ambientOsc.push(bassOsc);
    this.ambientGains.push(bassGain);

    // Mid pad (filtered sawtooth)
    const padOsc = this.ctx.createOscillator();
    padOsc.type = 'sawtooth';
    padOsc.frequency.value = 110;
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 300;
    padFilter.Q.value = 2;
    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.05;
    padOsc.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.musicGain);
    padOsc.start();
    this.ambientOsc.push(padOsc);
    this.ambientGains.push(padGain);

    // High shimmer (triangle with LFO)
    const shimmerOsc = this.ctx.createOscillator();
    shimmerOsc.type = 'triangle';
    shimmerOsc.frequency.value = 440;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(shimmerOsc.frequency);
    lfo.start();
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.02;
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.musicGain);
    shimmerOsc.start();
    this.ambientOsc.push(shimmerOsc);
    this.ambientGains.push(shimmerGain);

    // Subtle sub-bass pulse
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 36.7; // D1
    const subLfo = this.ctx.createOscillator();
    subLfo.type = 'sine';
    subLfo.frequency.value = 0.08;
    const subLfoGain = this.ctx.createGain();
    subLfoGain.gain.value = 0.04;
    subLfo.connect(subLfoGain);
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.06;
    subLfoGain.connect(subGain.gain);
    subOsc.connect(subGain);
    subGain.connect(this.musicGain);
    subOsc.start();
    subLfo.start();
    this.ambientOsc.push(subOsc);
    this.ambientGains.push(subGain);
  }

  stopAmbientMusic() {
    for (const osc of this.ambientOsc) {
      try { osc.stop(); } catch {}
    }
    this.ambientOsc = [];
    this.ambientGains = [];
  }

  /**
   * Ball rolling sound — continuous noise, pitch/volume scales with speed.
   */
  startRollingSound() {
    if (this.rollingNoise) return;

    // Create brown noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }

    this.rollingNoise = this.ctx.createBufferSource();
    this.rollingNoise.buffer = buffer;
    this.rollingNoise.loop = true;
    this.rollingNoise.connect(this.rollingFilter);
    this.rollingNoise.start();
    this.rollingGain.gain.value = 0;
  }

  updateRollingSound(speed: number) {
    if (!this.rollingNoise) return;
    const vol = Math.min(0.4, speed * 0.06);
    const freq = 150 + speed * 80;
    this.rollingGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    this.rollingFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
  }

  stopRollingSound() {
    if (this.rollingNoise) {
      this.rollingGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      try {
        this.rollingNoise.stop(this.ctx.currentTime + 0.1);
      } catch {}
      this.rollingNoise = null;
    }
  }

  /**
   * Pin crash sound — filtered noise burst with randomized pitch.
   */
  playPinCrash(intensity: number = 1) {
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * intensity;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + Math.random() * 600;
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.3 * intensity;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.1, 0.1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
    source.stop(this.ctx.currentTime + 0.4);
  }

  /**
   * Multiple pin crash (scatter) — rapid succession.
   */
  playPinScatter(count: number) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      setTimeout(() => {
        this.playPinCrash(0.5 + Math.random() * 0.5);
      }, i * 50 + Math.random() * 30);
    }
  }

  /**
   * Gutter thud — low impact sound.
   */
  playGutterThud() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60;
    osc.frequency.setTargetAtTime(30, this.ctx.currentTime + 0.05, 0.1);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.1, 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);

    // Add noise component
    const bufSize = this.ctx.sampleRate * 0.15;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufSize * 5) * 0.2;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.value = 0.3;
    noise.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start();
  }

  /**
   * Strike fanfare — ascending arpeggio + crash cymbal.
   */
  playStrikeFanfare() {
    const notes = [261.6, 329.6, 392, 523.2, 659.2, 784]; // C4 to G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        osc.type = i < 3 ? 'triangle' : 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.15;
        gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.3, 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
      }, i * 80);
    });

    // Crash cymbal (noise burst)
    setTimeout(() => {
      const bufSize = this.ctx.sampleRate * 0.8;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufSize * 4) * 0.15;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.2;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start();
    }, 400);
  }

  /**
   * Spare chime — pleasant ascending tones.
   */
  playSpareChime() {
    const notes = [392, 493.9, 587.3]; // G4, B4, D5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.12;
        gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.4, 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
      }, i * 120);
    });
  }

  /**
   * Gutter ball sad trombone.
   */
  playGutterSad() {
    const notes = [293.7, 277.2, 261.6, 246.9]; // D4 descending
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.3, 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
      }, i * 200);
    });
  }

  /**
   * UI select click.
   */
  playUIClick() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.03, 0.02);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * Throw whoosh sound.
   */
  playThrowWhoosh(speed: number) {
    const bufSize = this.ctx.sampleRate * 0.3;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / bufSize;
      d[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = 0.8 + speed * 0.1;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600 + speed * 200;
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  /**
   * Achievement unlock sound.
   */
  playAchievementUnlock() {
    const notes = [523.2, 659.2, 784, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.25, 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
      }, i * 100);
    });
  }

  /**
   * Ball return mechanical sound.
   */
  playBallReturn() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    osc.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.1;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.3, 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  /**
   * Pin reset / sweep sound.
   */
  playSweepSound() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.12;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.4, 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.7);
  }

  /**
   * Turkey (3 strikes) celebration.
   */
  playTurkeyCelebration() {
    this.playStrikeFanfare();
    setTimeout(() => {
      const notes = [784, 880, 987.8, 1046.5, 1174.7, 1318.5]; // G5 to E6
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const gain = this.ctx.createGain();
          gain.gain.value = 0.08;
          gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.2, 0.1);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.4);
        }, i * 60);
      });
    }, 600);
  }

  setMusicVolume(vol: number) {
    this.musicVolume = vol;
    this.musicGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  setSFXVolume(vol: number) {
    this.sfxVolume = vol;
    this.sfxGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }
}
