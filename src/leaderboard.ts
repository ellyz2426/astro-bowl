/**
 * Astro Bowl VR — Leaderboard
 * Local personal bests with timestamps.
 */
export interface LeaderboardEntry {
  score: number;
  date: string;
  ballType: string;
  theme: string;
  strikes: number;
  spares: number;
}

export class LeaderboardManager {
  private storageKey = 'astro-bowl-leaderboard';
  entries: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.entries = JSON.parse(saved);
      }
    } catch {
      this.entries = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch {}
  }

  addScore(entry: LeaderboardEntry): { rank: number; isNewBest: boolean } {
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score);
    if (this.entries.length > 20) {
      this.entries = this.entries.slice(0, 20);
    }
    this.save();

    const rank = this.entries.findIndex(e => e === entry) + 1;
    const isNewBest = rank === 1;
    return { rank, isNewBest };
  }

  getTopScores(count: number = 10): LeaderboardEntry[] {
    return this.entries.slice(0, count);
  }

  getBestScore(): number {
    return this.entries.length > 0 ? this.entries[0].score : 0;
  }
}
