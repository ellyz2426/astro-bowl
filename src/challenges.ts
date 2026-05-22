/**
 * Astro Bowl VR — Challenge Modes
 * Strike Challenge, Spare Practice, Speed Bowl, and Perfect Game attempt.
 */
import { GameManager, GameState, FrameScore } from './game';

export enum ChallengeType {
  STRIKE_CHALLENGE = 'strike_challenge',
  SPARE_PRACTICE = 'spare_practice',
  SPEED_BOWL = 'speed_bowl',
  SPLIT_CHALLENGE = 'split_challenge',
}

export interface ChallengeConfig {
  type: ChallengeType;
  name: string;
  description: string;
  frames: number; // how many attempts/frames
  targetScore: number;
  timeLimit: number; // seconds, 0 = no limit
  pinSetup: number[] | null; // null = normal 10 pins, otherwise specific pins standing
}

export const CHALLENGES: Record<ChallengeType, ChallengeConfig> = {
  [ChallengeType.STRIKE_CHALLENGE]: {
    type: ChallengeType.STRIKE_CHALLENGE,
    name: 'Strike Master',
    description: 'Get as many strikes as you can in 10 frames',
    frames: 10,
    targetScore: 10, // 10 strikes
    timeLimit: 0,
    pinSetup: null,
  },
  [ChallengeType.SPARE_PRACTICE]: {
    type: ChallengeType.SPARE_PRACTICE,
    name: 'Spare Clinic',
    description: 'Convert 8 different spare setups',
    frames: 8,
    targetScore: 8,
    timeLimit: 0,
    pinSetup: null, // changes each frame
  },
  [ChallengeType.SPEED_BOWL]: {
    type: ChallengeType.SPEED_BOWL,
    name: 'Speed Bowl',
    description: 'Bowl a full game in under 3 minutes',
    frames: 10,
    targetScore: 100,
    timeLimit: 180,
    pinSetup: null,
  },
  [ChallengeType.SPLIT_CHALLENGE]: {
    type: ChallengeType.SPLIT_CHALLENGE,
    name: 'Split Master',
    description: 'Convert 5 tricky splits',
    frames: 5,
    targetScore: 5,
    timeLimit: 0,
    pinSetup: null, // specific splits per frame
  },
};

// Common spare setups (pin indices that are standing)
export const SPARE_SETUPS: { name: string; pins: boolean[] }[] = [
  {
    name: '7 Pin',
    pins: [false, false, false, false, false, false, true, false, false, false],
  },
  {
    name: '10 Pin',
    pins: [false, false, false, false, false, false, false, false, false, true],
  },
  {
    name: '3-6-10',
    pins: [false, false, true, false, false, true, false, false, false, true],
  },
  {
    name: '2-4-5',
    pins: [false, true, false, true, true, false, false, false, false, false],
  },
  {
    name: '1-2-4-7',
    pins: [true, true, false, true, false, false, true, false, false, false],
  },
  {
    name: '5-6',
    pins: [false, false, false, false, true, true, false, false, false, false],
  },
  {
    name: '3-5-6-9-10',
    pins: [false, false, true, false, true, true, false, false, true, true],
  },
  {
    name: '4-7-8',
    pins: [false, false, false, true, false, false, true, true, false, false],
  },
];

// Split setups (harder)
export const SPLIT_SETUPS: { name: string; pins: boolean[] }[] = [
  {
    name: '7-10 Split',
    pins: [false, false, false, false, false, false, true, false, false, true],
  },
  {
    name: '4-6 Baby Split',
    pins: [false, false, false, true, false, true, false, false, false, false],
  },
  {
    name: '3-7 Split',
    pins: [false, false, true, false, false, false, true, false, false, false],
  },
  {
    name: '4-6-7-10 Greek Church',
    pins: [false, false, false, true, false, true, true, false, false, true],
  },
  {
    name: '2-7 Split',
    pins: [false, true, false, false, false, false, true, false, false, false],
  },
];

export class ChallengeManager {
  currentChallenge: ChallengeConfig | null = null;
  frameIndex: number = 0;
  successes: number = 0;
  elapsedTime: number = 0;
  isActive: boolean = false;
  private storageKey = 'astro-bowl-challenges';
  bestScores: Record<string, number> = {};

  onChallengeComplete: (success: boolean, stats: { successes: number; total: number; time: number }) => void = () => {};

  constructor() {
    this.loadBests();
  }

  private loadBests() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) this.bestScores = JSON.parse(saved);
    } catch {}
  }

  private saveBests() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.bestScores));
    } catch {}
  }

  startChallenge(type: ChallengeType) {
    this.currentChallenge = CHALLENGES[type];
    this.frameIndex = 0;
    this.successes = 0;
    this.elapsedTime = 0;
    this.isActive = true;
  }

  /**
   * Get the pin setup for the current frame in spare/split challenges.
   */
  getCurrentPinSetup(): boolean[] | null {
    if (!this.currentChallenge) return null;

    if (this.currentChallenge.type === ChallengeType.SPARE_PRACTICE) {
      const setup = SPARE_SETUPS[this.frameIndex % SPARE_SETUPS.length];
      return setup.pins;
    }

    if (this.currentChallenge.type === ChallengeType.SPLIT_CHALLENGE) {
      const setup = SPLIT_SETUPS[this.frameIndex % SPLIT_SETUPS.length];
      return setup.pins;
    }

    return null; // Normal full pins
  }

  getCurrentSetupName(): string {
    if (!this.currentChallenge) return '';

    if (this.currentChallenge.type === ChallengeType.SPARE_PRACTICE) {
      return SPARE_SETUPS[this.frameIndex % SPARE_SETUPS.length].name;
    }

    if (this.currentChallenge.type === ChallengeType.SPLIT_CHALLENGE) {
      return SPLIT_SETUPS[this.frameIndex % SPLIT_SETUPS.length].name;
    }

    return '';
  }

  /**
   * Record a frame result for the challenge.
   * Returns true if the player succeeded this frame.
   */
  recordFrameResult(isStrike: boolean, isSpare: boolean, allPinsDown: boolean): boolean {
    if (!this.currentChallenge || !this.isActive) return false;

    let success = false;

    switch (this.currentChallenge.type) {
      case ChallengeType.STRIKE_CHALLENGE:
        success = isStrike;
        break;
      case ChallengeType.SPARE_PRACTICE:
        success = allPinsDown; // Cleared all remaining pins
        break;
      case ChallengeType.SPLIT_CHALLENGE:
        success = allPinsDown;
        break;
      case ChallengeType.SPEED_BOWL:
        success = true; // Just completing frames counts
        break;
    }

    if (success) this.successes++;
    this.frameIndex++;

    // Check completion
    if (this.frameIndex >= this.currentChallenge.frames) {
      this.isActive = false;
      const passed = this.successes >= this.currentChallenge.targetScore ||
        (this.currentChallenge.type === ChallengeType.SPEED_BOWL &&
         this.elapsedTime < this.currentChallenge.timeLimit);

      // Save best
      const key = this.currentChallenge.type;
      if (!this.bestScores[key] || this.successes > this.bestScores[key]) {
        this.bestScores[key] = this.successes;
        this.saveBests();
      }

      this.onChallengeComplete(passed, {
        successes: this.successes,
        total: this.currentChallenge.frames,
        time: this.elapsedTime,
      });
    }

    return success;
  }

  updateTime(dt: number) {
    if (this.isActive && this.currentChallenge?.timeLimit) {
      this.elapsedTime += dt;
    }
  }

  getRemainingTime(): number {
    if (!this.currentChallenge?.timeLimit) return -1;
    return Math.max(0, this.currentChallenge.timeLimit - this.elapsedTime);
  }
}
