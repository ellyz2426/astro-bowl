/**
 * Astro Bowl VR — Multiplayer System
 * Local turn-based multiplayer for 2-4 players.
 * Each player has their own name, color, ball preference, scorecard.
 */
import { Color } from '@iwsdk/core';
import { GameManager, FrameScore, GameStats } from './game';

export interface PlayerConfig {
  name: string;
  color: Color;
  ballType: string;
  index: number;
}

export interface PlayerState {
  config: PlayerConfig;
  frames: FrameScore[];
  totalScore: number;
  stats: GameStats;
  gameManager: GameManager;
}

const PLAYER_COLORS: Color[] = [
  new Color(0x00ffff), // Cyan
  new Color(0xff00ff), // Magenta
  new Color(0xffff00), // Yellow
  new Color(0x00ff88), // Green
];

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export class MultiplayerManager {
  players: PlayerState[] = [];
  currentPlayerIndex: number = 0;
  playerCount: number = 0;
  active: boolean = false;
  roundComplete: boolean = false;
  gameComplete: boolean = false;
  private turnChangeCallbacks: ((player: PlayerState) => void)[] = [];
  private gameOverCallbacks: ((rankings: PlayerState[]) => void)[] = [];

  /**
   * Start a multiplayer game with N players.
   */
  start(playerCount: number, names?: string[]) {
    this.playerCount = Math.min(4, Math.max(2, playerCount));
    this.players = [];
    this.currentPlayerIndex = 0;
    this.active = true;
    this.roundComplete = false;
    this.gameComplete = false;

    for (let i = 0; i < this.playerCount; i++) {
      const gm = new GameManager();
      this.players.push({
        config: {
          name: names?.[i] || DEFAULT_NAMES[i],
          color: PLAYER_COLORS[i],
          ballType: 'standard',
          index: i,
        },
        frames: gm.frames,
        totalScore: 0,
        stats: gm.stats,
        gameManager: gm,
      });
    }
  }

  stop() {
    this.active = false;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.gameComplete = false;
  }

  getCurrentPlayer(): PlayerState | null {
    if (!this.active || this.players.length === 0) return null;
    return this.players[this.currentPlayerIndex];
  }

  getCurrentGameManager(): GameManager | null {
    const player = this.getCurrentPlayer();
    return player?.gameManager || null;
  }

  /**
   * Advance to the next player's turn.
   * Returns true if all players have completed the current frame,
   * meaning it's time for a new frame (or game over).
   */
  advanceTurn(): { nextPlayer: PlayerState | null; allDone: boolean; roundDone: boolean } {
    if (!this.active) return { nextPlayer: null, allDone: false, roundDone: false };

    const currentPlayer = this.players[this.currentPlayerIndex];
    currentPlayer.totalScore = currentPlayer.gameManager.getTotalScore();
    currentPlayer.stats = { ...currentPlayer.gameManager.stats };

    // Check if current player's game is complete
    if (currentPlayer.gameManager.gameComplete) {
      // Check if ALL players are done
      const allDone = this.players.every(p => p.gameManager.gameComplete);
      if (allDone) {
        this.gameComplete = true;
        const rankings = this.getRankings();
        this.gameOverCallbacks.forEach(cb => cb(rankings));
        return { nextPlayer: null, allDone: true, roundDone: true };
      }
    }

    // Move to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;

    // Skip players who are already done (10th frame edge case)
    let attempts = 0;
    while (this.players[this.currentPlayerIndex].gameManager.gameComplete && attempts < this.playerCount) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
      attempts++;
    }

    // Check if we've completed a round (all players bowled this frame)
    const roundDone = this.currentPlayerIndex === 0;

    const nextPlayer = this.players[this.currentPlayerIndex];
    this.turnChangeCallbacks.forEach(cb => cb(nextPlayer));

    return { nextPlayer, allDone: false, roundDone };
  }

  getRankings(): PlayerState[] {
    return [...this.players].sort((a, b) => b.totalScore - a.totalScore);
  }

  getLeader(): PlayerState | null {
    if (this.players.length === 0) return null;
    return this.players.reduce((best, p) => p.totalScore > best.totalScore ? p : best);
  }

  getScoreboard(): { name: string; color: string; score: number; frame: number; isActive: boolean }[] {
    return this.players.map((p, i) => ({
      name: p.config.name,
      color: `#${p.config.color.getHexString()}`,
      score: p.totalScore,
      frame: p.gameManager.currentFrame + 1,
      isActive: i === this.currentPlayerIndex,
    }));
  }

  onTurnChange(cb: (player: PlayerState) => void) {
    this.turnChangeCallbacks.push(cb);
  }

  onGameOver(cb: (rankings: PlayerState[]) => void) {
    this.gameOverCallbacks.push(cb);
  }

  setPlayerBall(playerIndex: number, ballType: string) {
    if (playerIndex >= 0 && playerIndex < this.players.length) {
      this.players[playerIndex].config.ballType = ballType;
    }
  }
}
