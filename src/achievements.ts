/**
 * Astro Bowl VR — Achievements System
 * Track and display bowling achievements.
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
}

const ACHIEVEMENT_DEFS: { id: string; name: string; description: string }[] = [
  { id: 'perfect_game', name: 'Perfect Game', description: 'Score 300 — 12 consecutive strikes' },
  { id: 'turkey', name: 'Turkey', description: 'Get 3 strikes in a row' },
  { id: 'four_bagger', name: 'Four Bagger', description: 'Get 4 strikes in a row' },
  { id: 'six_pack', name: 'Six Pack', description: 'Get 6 strikes in a row' },
  { id: 'split_conversion', name: 'Split Master', description: 'Convert a 7-10 split' },
  { id: 'clean_game', name: 'Clean Game', description: 'All frames are strikes or spares' },
  { id: 'century_club', name: 'Century Club', description: 'Score 100 or more' },
  { id: 'two_hundred', name: 'Double Century', description: 'Score 200 or more' },
  { id: 'gutter_master', name: 'Gutter Master', description: 'Get 10 consecutive gutters' },
  { id: 'spare_machine', name: 'Spare Machine', description: 'Get 5 spares in a single game' },
  { id: 'first_strike', name: 'First Strike', description: 'Get your first strike' },
  { id: 'first_spare', name: 'First Spare', description: 'Get your first spare' },
  { id: 'first_game', name: 'Rookie', description: 'Complete your first game' },
  { id: 'ten_games', name: 'Regular', description: 'Complete 10 games' },
  { id: 'ball_collector', name: 'Ball Collector', description: 'Try all 5 ball types' },
  { id: 'theme_explorer', name: 'Theme Explorer', description: 'Play a game in each lane theme' },
  { id: 'gutter_free', name: 'Stay on Track', description: 'Complete a game with zero gutters' },
  { id: 'all_spare_frame', name: 'Spare Streak', description: 'Get 3 spares in a row' },
];

export class AchievementTracker {
  achievements: Achievement[] = [];
  private storageKey = 'astro-bowl-achievements';
  private gameStats: {
    ballsUsed: Set<string>;
    themesPlayed: Set<string>;
    gamesCompleted: number;
    consecutiveGutters: number;
    consecutiveSpares: number;
    consecutiveStrikes: number;
  };

  onUnlock: (achievement: Achievement) => void = () => {};

  constructor() {
    this.gameStats = {
      ballsUsed: new Set(),
      themesPlayed: new Set(),
      gamesCompleted: 0,
      consecutiveGutters: 0,
      consecutiveSpares: 0,
      consecutiveStrikes: 0,
    };
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.achievements = ACHIEVEMENT_DEFS.map(def => {
          const savedAch = data.achievements?.find((a: any) => a.id === def.id);
          return {
            ...def,
            unlocked: savedAch?.unlocked || false,
            unlockedDate: savedAch?.unlockedDate,
          };
        });
        this.gameStats.gamesCompleted = data.gamesCompleted || 0;
        this.gameStats.ballsUsed = new Set(data.ballsUsed || []);
        this.gameStats.themesPlayed = new Set(data.themesPlayed || []);
      } else {
        this.achievements = ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: false }));
      }
    } catch {
      this.achievements = ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: false }));
    }
  }

  private save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        achievements: this.achievements,
        gamesCompleted: this.gameStats.gamesCompleted,
        ballsUsed: Array.from(this.gameStats.ballsUsed),
        themesPlayed: Array.from(this.gameStats.themesPlayed),
      }));
    } catch {}
  }

  private unlock(id: string) {
    const ach = this.achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.unlockedDate = new Date().toLocaleDateString();
      this.save();
      this.onUnlock(ach);
    }
  }

  recordStrike() {
    this.gameStats.consecutiveStrikes++;
    this.gameStats.consecutiveGutters = 0;
    this.gameStats.consecutiveSpares = 0;
    this.unlock('first_strike');
    if (this.gameStats.consecutiveStrikes >= 3) this.unlock('turkey');
    if (this.gameStats.consecutiveStrikes >= 4) this.unlock('four_bagger');
    if (this.gameStats.consecutiveStrikes >= 6) this.unlock('six_pack');
  }

  recordSpare() {
    this.gameStats.consecutiveSpares++;
    this.gameStats.consecutiveStrikes = 0;
    this.gameStats.consecutiveGutters = 0;
    this.unlock('first_spare');
    if (this.gameStats.consecutiveSpares >= 3) this.unlock('all_spare_frame');
  }

  recordGutter() {
    this.gameStats.consecutiveGutters++;
    this.gameStats.consecutiveStrikes = 0;
    this.gameStats.consecutiveSpares = 0;
    if (this.gameStats.consecutiveGutters >= 10) this.unlock('gutter_master');
  }

  recordOpen() {
    this.gameStats.consecutiveStrikes = 0;
    this.gameStats.consecutiveSpares = 0;
    this.gameStats.consecutiveGutters = 0;
  }

  recordBallUsed(ballType: string) {
    this.gameStats.ballsUsed.add(ballType);
    if (this.gameStats.ballsUsed.size >= 5) this.unlock('ball_collector');
    this.save();
  }

  recordThemePlayed(theme: string) {
    this.gameStats.themesPlayed.add(theme);
    if (this.gameStats.themesPlayed.size >= 3) this.unlock('theme_explorer');
    this.save();
  }

  recordGameComplete(score: number, stats: { strikes: number; spares: number; gutters: number; perfectGame: boolean }) {
    this.gameStats.gamesCompleted++;
    this.unlock('first_game');
    if (this.gameStats.gamesCompleted >= 10) this.unlock('ten_games');
    if (score >= 100) this.unlock('century_club');
    if (score >= 200) this.unlock('two_hundred');
    if (score >= 300 && stats.perfectGame) this.unlock('perfect_game');
    if (stats.strikes + stats.spares >= 10) this.unlock('clean_game');
    if (stats.spares >= 5) this.unlock('spare_machine');
    if (stats.gutters === 0) this.unlock('gutter_free');
    this.save();
  }

  getAll(): Achievement[] {
    return this.achievements;
  }
}
