/**
 * Astro Bowl VR — Statistics Tracker
 * Persistent per-game history, running averages, ball type stats, streak records.
 */

export interface GameRecord {
  date: string;
  score: number;
  strikes: number;
  spares: number;
  gutters: number;
  totalPins: number;
  maxStreak: number;
  ballType: string;
  theme: string;
  perfectGame: boolean;
  frames: number[][]; // roll arrays per frame
}

export interface BallTypeStats {
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  avgScore: number;
  strikes: number;
  spares: number;
}

export interface OverallStats {
  totalGames: number;
  totalScore: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  totalStrikes: number;
  totalSpares: number;
  totalGutters: number;
  totalPinsKnocked: number;
  longestStreak: number;
  perfectGames: number;
  cleanGames: number;
  gamesOver200: number;
  gamesOver250: number;
  strikeRate: number; // percentage
  spareRate: number;
  pinAvgPerRoll: number;
  recentTrend: number[]; // last 10 scores
  ballTypeStats: Record<string, BallTypeStats>;
}

export class StatisticsTracker {
  private storageKey = 'astro-bowl-statistics';
  history: GameRecord[] = [];
  overall: OverallStats;

  constructor() {
    this.overall = this.freshOverall();
    this.load();
  }

  private freshOverall(): OverallStats {
    return {
      totalGames: 0,
      totalScore: 0,
      avgScore: 0,
      bestScore: 0,
      worstScore: 999,
      totalStrikes: 0,
      totalSpares: 0,
      totalGutters: 0,
      totalPinsKnocked: 0,
      longestStreak: 0,
      perfectGames: 0,
      cleanGames: 0,
      gamesOver200: 0,
      gamesOver250: 0,
      strikeRate: 0,
      spareRate: 0,
      pinAvgPerRoll: 0,
      recentTrend: [],
      ballTypeStats: {},
    };
  }

  private load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.history = data.history || [];
        if (data.overall) {
          this.overall = { ...this.freshOverall(), ...data.overall };
        }
      }
    } catch {
      this.history = [];
      this.overall = this.freshOverall();
    }
  }

  private save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        history: this.history.slice(-100), // Keep last 100 games
        overall: this.overall,
      }));
    } catch {}
  }

  recordGame(record: GameRecord) {
    this.history.push(record);

    const o = this.overall;
    o.totalGames++;
    o.totalScore += record.score;
    o.avgScore = Math.round(o.totalScore / o.totalGames);
    o.bestScore = Math.max(o.bestScore, record.score);
    o.worstScore = Math.min(o.worstScore, record.score);
    o.totalStrikes += record.strikes;
    o.totalSpares += record.spares;
    o.totalGutters += record.gutters;
    o.totalPinsKnocked += record.totalPins;
    o.longestStreak = Math.max(o.longestStreak, record.maxStreak);

    if (record.perfectGame) o.perfectGames++;
    if (record.strikes + record.spares >= 10) o.cleanGames++;
    if (record.score >= 200) o.gamesOver200++;
    if (record.score >= 250) o.gamesOver250++;

    // Calculate rates
    const totalFrames = o.totalGames * 10;
    const totalRolls = o.totalPinsKnocked > 0 ? totalFrames * 1.5 : 0; // approximate
    o.strikeRate = totalFrames > 0 ? Math.round(o.totalStrikes / totalFrames * 100) : 0;
    o.spareRate = totalFrames > 0 ? Math.round(o.totalSpares / totalFrames * 100) : 0;
    o.pinAvgPerRoll = totalRolls > 0 ? Math.round(o.totalPinsKnocked / totalRolls * 10) / 10 : 0;

    // Recent trend (last 10 scores)
    o.recentTrend = this.history.slice(-10).map(g => g.score);

    // Ball type stats
    if (!o.ballTypeStats[record.ballType]) {
      o.ballTypeStats[record.ballType] = {
        gamesPlayed: 0, totalScore: 0, bestScore: 0, avgScore: 0,
        strikes: 0, spares: 0,
      };
    }
    const bs = o.ballTypeStats[record.ballType];
    bs.gamesPlayed++;
    bs.totalScore += record.score;
    bs.bestScore = Math.max(bs.bestScore, record.score);
    bs.avgScore = Math.round(bs.totalScore / bs.gamesPlayed);
    bs.strikes += record.strikes;
    bs.spares += record.spares;

    this.save();
  }

  getScoreDistribution(): { label: string; count: number }[] {
    const buckets: Record<string, number> = {
      '0-50': 0, '51-100': 0, '101-150': 0, '151-200': 0,
      '201-250': 0, '251-300': 0,
    };
    for (const game of this.history) {
      if (game.score <= 50) buckets['0-50']++;
      else if (game.score <= 100) buckets['51-100']++;
      else if (game.score <= 150) buckets['101-150']++;
      else if (game.score <= 200) buckets['151-200']++;
      else if (game.score <= 250) buckets['201-250']++;
      else buckets['251-300']++;
    }
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }

  getRecentGames(count: number = 5): GameRecord[] {
    return this.history.slice(-count).reverse();
  }

  getImprovementTrend(): 'improving' | 'declining' | 'stable' | 'insufficient' {
    if (this.history.length < 5) return 'insufficient';
    const recent5 = this.history.slice(-5).map(g => g.score);
    const prev5 = this.history.slice(-10, -5).map(g => g.score);
    if (prev5.length < 3) return 'insufficient';
    const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length;
    const prevAvg = prev5.reduce((a, b) => a + b, 0) / prev5.length;
    const diff = recentAvg - prevAvg;
    if (diff > 10) return 'improving';
    if (diff < -10) return 'declining';
    return 'stable';
  }
}
