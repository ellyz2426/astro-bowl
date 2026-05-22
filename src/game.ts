/**
 * Astro Bowl VR — Game State Manager
 * Handles bowling scoring, frames, turn state, and game flow.
 */

export enum GameState {
  LOADING = 'loading',
  TITLE = 'title',
  BALL_SELECT = 'ball_select',
  SETTINGS = 'settings',
  PLAYING = 'playing',
  AIMING = 'aiming',
  THROWING = 'throwing',
  BALL_ROLLING = 'ball_rolling',
  PIN_SETTLING = 'pin_settling',
  SCORE_DISPLAY = 'score_display',
  FRAME_TRANSITION = 'frame_transition',
  GAME_OVER = 'game_over',
  LEADERBOARD = 'leaderboard',
  PAUSED = 'paused',
  CHALLENGE = 'challenge',
  PRACTICE = 'practice',
  ACHIEVEMENTS = 'achievements',
}

export interface FrameScore {
  rolls: number[];
  score: number | null; // null = not yet computable
  isStrike: boolean;
  isSpare: boolean;
  display: string;
}

export interface GameStats {
  strikes: number;
  spares: number;
  gutters: number;
  totalPins: number;
  maxStreak: number;
  currentStreak: number;
  perfectGame: boolean;
}

export class GameManager {
  state: GameState = GameState.LOADING;
  prevState: GameState = GameState.LOADING;
  frames: FrameScore[] = [];
  currentFrame: number = 0;
  currentRoll: number = 0; // 0 = first ball, 1 = second ball, 2 = bonus (10th frame)
  pinsStanding: boolean[] = new Array(10).fill(true);
  totalScore: number = 0;
  stats: GameStats = this.freshStats();
  ballType: string = 'standard';
  laneTheme: string = 'neon_circuit';
  gameComplete: boolean = false;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.reset();
  }

  private freshStats(): GameStats {
    return {
      strikes: 0,
      spares: 0,
      gutters: 0,
      totalPins: 0,
      maxStreak: 0,
      currentStreak: 0,
      perfectGame: true,
    };
  }

  reset() {
    this.frames = [];
    for (let i = 0; i < 10; i++) {
      this.frames.push({
        rolls: [],
        score: null,
        isStrike: false,
        isSpare: false,
        display: '',
      });
    }
    this.currentFrame = 0;
    this.currentRoll = 0;
    this.pinsStanding = new Array(10).fill(true);
    this.totalScore = 0;
    this.stats = this.freshStats();
    this.gameComplete = false;
  }

  on(event: string, cb: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }

  emit(event: string, data?: any) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(data));
  }

  setState(newState: GameState) {
    this.prevState = this.state;
    this.state = newState;
    this.emit('stateChange', { from: this.prevState, to: newState });
  }

  /**
   * Record pins knocked down this roll.
   * Returns { pinsDown, isStrike, isSpare, frameComplete, gameOver }
   */
  recordRoll(pinsKnockedDown: number): {
    pinsDown: number;
    isStrike: boolean;
    isSpare: boolean;
    frameComplete: boolean;
    gameOver: boolean;
  } {
    const frame = this.frames[this.currentFrame];
    frame.rolls.push(pinsKnockedDown);

    this.stats.totalPins += pinsKnockedDown;
    if (pinsKnockedDown === 0) this.stats.gutters++;

    let isStrike = false;
    let isSpare = false;
    let frameComplete = false;
    let gameOver = false;

    if (this.currentFrame < 9) {
      // Frames 1-9
      if (this.currentRoll === 0) {
        if (pinsKnockedDown === 10) {
          // Strike
          isStrike = true;
          frame.isStrike = true;
          frame.display = 'X';
          frameComplete = true;
          this.stats.strikes++;
          this.stats.currentStreak++;
          this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
        } else {
          this.currentRoll = 1;
          // Update pins standing
          this.markPinsDown(pinsKnockedDown);
        }
      } else {
        // Second roll
        const firstRoll = frame.rolls[0];
        if (firstRoll + pinsKnockedDown === 10) {
          isSpare = true;
          frame.isSpare = true;
          frame.display = `${firstRoll}/`;
          this.stats.spares++;
        } else {
          frame.display = `${firstRoll}${pinsKnockedDown === 0 ? '-' : pinsKnockedDown}`;
          this.stats.currentStreak = 0;
          if (firstRoll + pinsKnockedDown < 10) this.stats.perfectGame = false;
        }
        frameComplete = true;
      }
    } else {
      // 10th frame — up to 3 rolls
      const rolls = frame.rolls;
      if (rolls.length === 1) {
        if (pinsKnockedDown === 10) {
          isStrike = true;
          frame.isStrike = true;
          this.stats.strikes++;
          this.stats.currentStreak++;
          this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
          this.currentRoll = 1;
          // Reset pins for next roll
          this.pinsStanding = new Array(10).fill(true);
        } else {
          this.currentRoll = 1;
          this.markPinsDown(pinsKnockedDown);
        }
      } else if (rolls.length === 2) {
        const first = rolls[0];
        const second = rolls[1];
        if (first === 10) {
          // After first strike
          if (pinsKnockedDown === 10) {
            isStrike = true;
            this.stats.strikes++;
            this.stats.currentStreak++;
            this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
            this.currentRoll = 2;
            this.pinsStanding = new Array(10).fill(true);
          } else if (first === 10 && second + pinsKnockedDown === 10 && second !== 10) {
            // Spare after strike
            isSpare = true;
            this.stats.spares++;
            this.currentRoll = 2;
            this.pinsStanding = new Array(10).fill(true);
          } else {
            if (second === 10) {
              // Two strikes, need third
              this.currentRoll = 2;
              this.pinsStanding = new Array(10).fill(true);
            } else {
              // Check if spare
              if (second + pinsKnockedDown === 10) {
                isSpare = true;
                this.stats.spares++;
                this.currentRoll = 2;
                this.pinsStanding = new Array(10).fill(true);
              } else {
                this.currentRoll = 2;
              }
            }
          }
        } else {
          // Not a strike on first
          if (first + pinsKnockedDown === 10) {
            isSpare = true;
            frame.isSpare = true;
            this.stats.spares++;
            this.currentRoll = 2;
            this.pinsStanding = new Array(10).fill(true);
          } else {
            // No bonus, frame done after 2
            frameComplete = true;
            this.stats.currentStreak = 0;
            this.stats.perfectGame = false;
          }
        }
        // If strike or spare on first+second, need 3rd roll
        if (!frameComplete && (first === 10 || first + second === 10)) {
          // Proceed to 3rd roll
        }
      } else if (rolls.length === 3) {
        if (pinsKnockedDown === 10) {
          isStrike = true;
          this.stats.strikes++;
        }
        frameComplete = true;
      }
    }

    if (frameComplete) {
      this.calculateScores();
      if (this.currentFrame >= 9) {
        gameOver = true;
        this.gameComplete = true;
        this.totalScore = this.getTotalScore();
      } else {
        this.currentFrame++;
        this.currentRoll = 0;
        this.pinsStanding = new Array(10).fill(true);
      }
    } else {
      this.calculateScores();
    }

    const result = { pinsDown: pinsKnockedDown, isStrike, isSpare, frameComplete, gameOver };
    this.emit('rollComplete', result);
    return result;
  }

  private markPinsDown(count: number) {
    // In practice, exact pin positions are determined by physics
    // This is for the scoring logic tracking
    let marked = 0;
    for (let i = 0; i < this.pinsStanding.length && marked < count; i++) {
      if (this.pinsStanding[i]) {
        this.pinsStanding[i] = false;
        marked++;
      }
    }
  }

  /**
   * Standard bowling scoring with look-ahead for strikes/spares.
   */
  calculateScores() {
    // Flatten all rolls
    const allRolls: number[] = [];
    for (const frame of this.frames) {
      allRolls.push(...frame.rolls);
    }

    let rollIndex = 0;
    let cumulative = 0;

    for (let f = 0; f < 10; f++) {
      const frame = this.frames[f];
      if (frame.rolls.length === 0) {
        frame.score = null;
        continue;
      }

      if (f < 9) {
        if (frame.isStrike) {
          // Strike: 10 + next 2 rolls
          if (rollIndex + 2 < allRolls.length) {
            const bonus1 = allRolls[rollIndex + 1];
            const bonus2 = allRolls[rollIndex + 2];
            if (bonus1 !== undefined && bonus2 !== undefined) {
              cumulative += 10 + bonus1 + bonus2;
              frame.score = cumulative;
            } else {
              frame.score = null;
            }
          } else {
            frame.score = null;
          }
          rollIndex += 1;
        } else if (frame.isSpare) {
          // Spare: 10 + next 1 roll
          if (rollIndex + 2 < allRolls.length) {
            const bonus = allRolls[rollIndex + 2];
            if (bonus !== undefined) {
              cumulative += 10 + bonus;
              frame.score = cumulative;
            } else {
              frame.score = null;
            }
          } else {
            frame.score = null;
          }
          rollIndex += 2;
        } else {
          // Normal
          if (frame.rolls.length >= 2) {
            cumulative += frame.rolls[0] + frame.rolls[1];
            frame.score = cumulative;
          } else {
            frame.score = null;
          }
          rollIndex += 2;
        }
      } else {
        // 10th frame: sum all rolls (up to 3)
        const sum = frame.rolls.reduce((a, b) => a + b, 0);
        cumulative += sum;
        frame.score = frame.rolls.length >= 2 &&
          (frame.rolls[0] === 10 || frame.rolls[0] + frame.rolls[1] === 10
            ? frame.rolls.length === 3
            : true)
          ? cumulative
          : null;
        rollIndex += frame.rolls.length;
      }
    }

    this.totalScore = cumulative;
  }

  getTotalScore(): number {
    let total = 0;
    for (const frame of this.frames) {
      if (frame.score !== null) total = frame.score;
    }
    return total;
  }

  getFrameDisplay(frameIndex: number): string {
    const frame = this.frames[frameIndex];
    if (frame.rolls.length === 0) return '';
    if (frameIndex < 9) {
      if (frame.isStrike) return 'X';
      if (frame.isSpare) return `${frame.rolls[0]}/${frame.score !== null ? '' : ''}`;
      if (frame.rolls.length === 1) return `${frame.rolls[0]}`;
      return `${frame.rolls[0]}${frame.rolls[1] === 0 ? '-' : frame.rolls[1]}`;
    }
    // 10th frame
    let display = '';
    for (let i = 0; i < frame.rolls.length; i++) {
      const r = frame.rolls[i];
      if (r === 10) {
        display += 'X';
      } else if (i > 0 && frame.rolls[i - 1] !== 10 && frame.rolls[i - 1] + r === 10) {
        display += '/';
      } else if (r === 0) {
        display += '-';
      } else {
        display += r.toString();
      }
    }
    return display;
  }

  getPinsStanding(): number {
    return this.pinsStanding.filter(p => p).length;
  }

  needsSecondRoll(): boolean {
    if (this.currentFrame < 9) {
      return this.currentRoll === 1;
    }
    return this.frames[9].rolls.length > 0 && !this.gameComplete;
  }

  needsPinReset(): boolean {
    if (this.currentFrame < 9) {
      return this.currentRoll === 0;
    }
    // 10th frame: reset after strike
    const rolls = this.frames[9].rolls;
    if (rolls.length === 1 && rolls[0] === 10) return true;
    if (rolls.length === 2 && rolls[0] === 10 && rolls[1] === 10) return true;
    if (rolls.length === 2 && rolls[0] + rolls[1] === 10) return true;
    return false;
  }
}
