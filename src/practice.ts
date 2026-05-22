/**
 * Astro Bowl VR — Practice Mode
 * Infinite free-bowl mode without frame scoring.
 * Track per-session stats: pins knocked, rolls thrown, strikes, spares.
 * Configurable pin setups for targeted practice.
 */

export interface PracticeStats {
  rollsThrown: number;
  totalPinsKnocked: number;
  strikes: number;
  spares: number;
  gutters: number;
  bestRoll: number;
  currentStreak: number;
  bestStreak: number;
  sessionStartTime: number;
}

export type PinPreset = 'full' | 'left_side' | 'right_side' | 'back_row' | 'front_three' | '7_10_split' | 'baby_split' | 'random';

export const PIN_PRESETS: Record<PinPreset, { name: string; pins: boolean[]; description: string }> = {
  full: {
    name: 'Full Rack',
    pins: [true, true, true, true, true, true, true, true, true, true],
    description: 'All 10 pins — standard setup',
  },
  left_side: {
    name: 'Left Side',
    pins: [true, true, false, true, true, false, true, true, false, false],
    description: 'Pins 1-2-4-5-7-8',
  },
  right_side: {
    name: 'Right Side',
    pins: [true, false, true, false, true, true, false, false, true, true],
    description: 'Pins 1-3-5-6-9-10',
  },
  back_row: {
    name: 'Back Row',
    pins: [false, false, false, false, false, false, true, true, true, true],
    description: 'Pins 7-8-9-10 only',
  },
  front_three: {
    name: 'Front Three',
    pins: [true, true, true, false, false, false, false, false, false, false],
    description: 'Pins 1-2-3 only',
  },
  '7_10_split': {
    name: '7-10 Split',
    pins: [false, false, false, false, false, false, true, false, false, true],
    description: 'The dreaded 7-10 split',
  },
  baby_split: {
    name: 'Baby Split',
    pins: [false, false, false, true, false, true, false, false, false, false],
    description: 'Pins 4-6 — the baby split',
  },
  random: {
    name: 'Random',
    pins: [true, true, true, true, true, true, true, true, true, true],
    description: 'Random pin configuration each roll',
  },
};

export class PracticeManager {
  stats: PracticeStats;
  currentPreset: PinPreset = 'full';
  isActive: boolean = false;
  private firstRollPins: number = 0;
  private isSecondRoll: boolean = false;

  constructor() {
    this.stats = this.freshStats();
  }

  private freshStats(): PracticeStats {
    return {
      rollsThrown: 0,
      totalPinsKnocked: 0,
      strikes: 0,
      spares: 0,
      gutters: 0,
      bestRoll: 0,
      currentStreak: 0,
      bestStreak: 0,
      sessionStartTime: Date.now(),
    };
  }

  start(preset: PinPreset = 'full') {
    this.stats = this.freshStats();
    this.currentPreset = preset;
    this.isActive = true;
    this.isSecondRoll = false;
    this.firstRollPins = 0;
  }

  stop() {
    this.isActive = false;
  }

  getPinSetup(): boolean[] {
    if (this.currentPreset === 'random') {
      const pins = new Array(10).fill(false);
      const count = 3 + Math.floor(Math.random() * 8); // 3–10 pins
      const indices = Array.from({ length: 10 }, (_, i) => i);
      // Shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      for (let i = 0; i < count; i++) {
        pins[indices[i]] = true;
      }
      return pins;
    }
    return [...PIN_PRESETS[this.currentPreset].pins];
  }

  getStandingCount(): number {
    return this.getPinSetup().filter(p => p).length;
  }

  /**
   * Record a roll result in practice mode.
   * Returns display message for the HUD.
   */
  recordRoll(pinsKnocked: number, totalPinsAtStart: number): { message: string; subMessage: string; isStrike: boolean; isSpare: boolean } {
    this.stats.rollsThrown++;
    this.stats.totalPinsKnocked += pinsKnocked;

    if (pinsKnocked > this.stats.bestRoll) {
      this.stats.bestRoll = pinsKnocked;
    }

    let isStrike = false;
    let isSpare = false;
    let message = '';
    let subMessage = '';

    if (pinsKnocked === 0) {
      this.stats.gutters++;
      this.stats.currentStreak = 0;
      message = 'GUTTER';
      subMessage = '';
      this.isSecondRoll = false;
    } else if (!this.isSecondRoll && pinsKnocked === totalPinsAtStart) {
      // Strike (all pins on first roll)
      isStrike = true;
      this.stats.strikes++;
      this.stats.currentStreak++;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
      message = 'STRIKE!';
      subMessage = this.stats.currentStreak >= 3 ? `${this.stats.currentStreak} in a row!` : `🎳 ${this.stats.strikes} total`;
      this.isSecondRoll = false;
    } else if (this.isSecondRoll && pinsKnocked === (totalPinsAtStart - this.firstRollPins)) {
      // Spare (cleaned up remaining pins)
      isSpare = true;
      this.stats.spares++;
      message = 'SPARE!';
      subMessage = `${this.stats.spares} total`;
      this.isSecondRoll = false;
    } else if (!this.isSecondRoll) {
      // First roll, pins remaining
      this.firstRollPins = pinsKnocked;
      this.isSecondRoll = true;
      message = `${pinsKnocked} PIN${pinsKnocked > 1 ? 'S' : ''}`;
      subMessage = `${totalPinsAtStart - pinsKnocked} remaining`;
    } else {
      // Second roll, didn't spare
      this.stats.currentStreak = 0;
      message = `${pinsKnocked} PIN${pinsKnocked > 1 ? 'S' : ''}`;
      subMessage = 'Open frame';
      this.isSecondRoll = false;
    }

    return { message, subMessage, isStrike, isSpare };
  }

  shouldResetPins(): boolean {
    // Reset after strike or after second roll
    return !this.isSecondRoll;
  }

  getElapsedTime(): number {
    return Math.floor((Date.now() - this.stats.sessionStartTime) / 1000);
  }

  getFormattedTime(): string {
    const secs = this.getElapsedTime();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getAveragePerRoll(): string {
    if (this.stats.rollsThrown === 0) return '0.0';
    return (this.stats.totalPinsKnocked / this.stats.rollsThrown).toFixed(1);
  }

  getStrikeRate(): string {
    if (this.stats.rollsThrown === 0) return '0%';
    return `${Math.round(this.stats.strikes / this.stats.rollsThrown * 100)}%`;
  }
}
