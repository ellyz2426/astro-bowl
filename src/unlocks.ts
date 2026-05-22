/**
 * Astro Bowl VR — Ball Unlock System
 * Progressive ball unlocking based on score milestones, achievements, and game events.
 * Balls start locked; players earn them through play.
 */

export interface UnlockCondition {
  type: 'score' | 'strikes' | 'spares' | 'games' | 'perfect_frame' | 'challenge' | 'cosmic' | 'achievement';
  description: string;
  /** For score: minimum single-game score. For strikes/spares/games: cumulative count. */
  threshold: number;
}

export interface BallUnlock {
  ballType: string;
  condition: UnlockCondition;
  unlocked: boolean;
}

const BALL_UNLOCKS: BallUnlock[] = [
  {
    ballType: 'standard',
    condition: { type: 'score', description: 'Available from the start', threshold: 0 },
    unlocked: true, // Always unlocked
  },
  {
    ballType: 'heavy',
    condition: { type: 'games', description: 'Play 3 games', threshold: 3 },
    unlocked: false,
  },
  {
    ballType: 'curve',
    condition: { type: 'spares', description: 'Get 10 total spares', threshold: 10 },
    unlocked: false,
  },
  {
    ballType: 'split_seeker',
    condition: { type: 'score', description: 'Score 150+ in a single game', threshold: 150 },
    unlocked: false,
  },
  {
    ballType: 'phantom',
    condition: { type: 'strikes', description: 'Get 20 total strikes', threshold: 20 },
    unlocked: false,
  },
  {
    ballType: 'ricochet',
    condition: { type: 'challenge', description: 'Complete any challenge mode', threshold: 1 },
    unlocked: false,
  },
  {
    ballType: 'magnetar',
    condition: { type: 'score', description: 'Score 200+ in a single game', threshold: 200 },
    unlocked: false,
  },
  {
    ballType: 'wormhole',
    condition: { type: 'perfect_frame', description: 'Get 3 strikes in a row (turkey)', threshold: 3 },
    unlocked: false,
  },
];

const STORAGE_KEY = 'astro-bowl-unlocks';
const PROGRESS_KEY = 'astro-bowl-unlock-progress';

export interface UnlockProgress {
  totalGames: number;
  totalStrikes: number;
  totalSpares: number;
  highScore: number;
  maxStreak: number;
  challengesCompleted: number;
  cosmicGamesPlayed: number;
}

export class BallUnlockManager {
  unlocks: BallUnlock[] = [];
  progress: UnlockProgress;
  private newUnlocks: string[] = [];
  private onUnlockCallback: ((ballType: string, condition: UnlockCondition) => void) | null = null;

  constructor() {
    this.progress = this.loadProgress();
    this.unlocks = this.loadUnlocks();
  }

  private loadUnlocks(): BallUnlock[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedUnlocks: Record<string, boolean> = JSON.parse(saved);
        return BALL_UNLOCKS.map(u => ({
          ...u,
          unlocked: savedUnlocks[u.ballType] ?? u.unlocked,
        }));
      }
    } catch {}
    return BALL_UNLOCKS.map(u => ({ ...u }));
  }

  private saveUnlocks() {
    try {
      const map: Record<string, boolean> = {};
      this.unlocks.forEach(u => map[u.ballType] = u.unlocked);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
  }

  private loadProgress(): UnlockProgress {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      totalGames: 0,
      totalStrikes: 0,
      totalSpares: 0,
      highScore: 0,
      maxStreak: 0,
      challengesCompleted: 0,
      cosmicGamesPlayed: 0,
    };
  }

  private saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.progress));
    } catch {}
  }

  /**
   * Record a completed game and check for new unlocks.
   */
  recordGameComplete(score: number, strikes: number, spares: number, maxStreak: number) {
    this.progress.totalGames++;
    this.progress.totalStrikes += strikes;
    this.progress.totalSpares += spares;
    this.progress.highScore = Math.max(this.progress.highScore, score);
    this.progress.maxStreak = Math.max(this.progress.maxStreak, maxStreak);
    this.saveProgress();
    this.checkUnlocks();
  }

  recordChallengeComplete() {
    this.progress.challengesCompleted++;
    this.saveProgress();
    this.checkUnlocks();
  }

  recordCosmicGamePlayed() {
    this.progress.cosmicGamesPlayed++;
    this.saveProgress();
    this.checkUnlocks();
  }

  /**
   * Check all unlock conditions against current progress.
   */
  private checkUnlocks() {
    this.newUnlocks = [];

    for (const unlock of this.unlocks) {
      if (unlock.unlocked) continue;

      let met = false;
      const c = unlock.condition;

      switch (c.type) {
        case 'score':
          met = this.progress.highScore >= c.threshold;
          break;
        case 'strikes':
          met = this.progress.totalStrikes >= c.threshold;
          break;
        case 'spares':
          met = this.progress.totalSpares >= c.threshold;
          break;
        case 'games':
          met = this.progress.totalGames >= c.threshold;
          break;
        case 'perfect_frame':
          met = this.progress.maxStreak >= c.threshold;
          break;
        case 'challenge':
          met = this.progress.challengesCompleted >= c.threshold;
          break;
        case 'cosmic':
          met = this.progress.cosmicGamesPlayed >= c.threshold;
          break;
      }

      if (met) {
        unlock.unlocked = true;
        this.newUnlocks.push(unlock.ballType);
        if (this.onUnlockCallback) {
          this.onUnlockCallback(unlock.ballType, unlock.condition);
        }
      }
    }

    if (this.newUnlocks.length > 0) {
      this.saveUnlocks();
    }
  }

  /**
   * Get all unlocked ball type IDs.
   */
  getUnlockedBalls(): string[] {
    return this.unlocks.filter(u => u.unlocked).map(u => u.ballType);
  }

  /**
   * Get all locked ball type IDs with their unlock conditions.
   */
  getLockedBalls(): { ballType: string; condition: UnlockCondition; progressPercent: number }[] {
    return this.unlocks
      .filter(u => !u.unlocked)
      .map(u => ({
        ballType: u.ballType,
        condition: u.condition,
        progressPercent: this.getProgressPercent(u.condition),
      }));
  }

  private getProgressPercent(condition: UnlockCondition): number {
    let current = 0;
    switch (condition.type) {
      case 'score': current = this.progress.highScore; break;
      case 'strikes': current = this.progress.totalStrikes; break;
      case 'spares': current = this.progress.totalSpares; break;
      case 'games': current = this.progress.totalGames; break;
      case 'perfect_frame': current = this.progress.maxStreak; break;
      case 'challenge': current = this.progress.challengesCompleted; break;
      case 'cosmic': current = this.progress.cosmicGamesPlayed; break;
    }
    return Math.min(100, Math.round((current / condition.threshold) * 100));
  }

  isUnlocked(ballType: string): boolean {
    const unlock = this.unlocks.find(u => u.ballType === ballType);
    return unlock?.unlocked ?? false;
  }

  getNewUnlocks(): string[] {
    const result = [...this.newUnlocks];
    this.newUnlocks = [];
    return result;
  }

  onUnlock(cb: (ballType: string, condition: UnlockCondition) => void) {
    this.onUnlockCallback = cb;
  }

  /**
   * Get formatted unlock info for UI display.
   */
  getUnlockInfo(): { ballType: string; unlocked: boolean; description: string; progress: number }[] {
    return this.unlocks.map(u => ({
      ballType: u.ballType,
      unlocked: u.unlocked,
      description: u.condition.description,
      progress: u.unlocked ? 100 : this.getProgressPercent(u.condition),
    }));
  }
}
