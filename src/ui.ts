/**
 * Astro Bowl VR — UI Screens
 * Title screen, game over, ball selection, settings, pause, achievements, leaderboard,
 * multiplayer setup, cosmic bowling, ball unlocks.
 */
import { BALL_TYPES } from './ball';
import { THEMES } from './environment';
import { ChallengeType, CHALLENGES } from './challenges';
import { CosmicEvent } from './cosmic';

export class UIManager {
  private overlay: HTMLDivElement;
  private currentScreen: string = 'none';
  onStartGame: () => void = () => {};
  onBallSelect: (ball: string) => void = () => {};
  onThemeSelect: (theme: string) => void = () => {};
  onResume: () => void = () => {};
  onQuit: () => void = () => {};
  onShowLeaderboard: () => void = () => {};
  onShowAchievements: () => void = () => {};
  onShowSettings: () => void = () => {};
  onPlayAgain: () => void = () => {};
  onStartChallenge: (type: ChallengeType) => void = () => {};
  onShowStatistics: () => void = () => {};
  onStartPractice: (preset: string) => void = () => {};
  onShowTutorial: () => void = () => {};
  onStartMultiplayer: (playerCount: number, names: string[]) => void = () => {};
  onStartCosmicBowling: () => void = () => {};
  onSkipReplay: () => void = () => {};
  onShowUnlocks: () => void = () => {};

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'ui-overlay';
    this.overlay.innerHTML = `
      <style>
        #ui-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Courier New', monospace;
          z-index: 200;
          pointer-events: none;
        }
        #ui-overlay.active { pointer-events: auto; }

        .ui-panel {
          background: rgba(0, 8, 16, 0.92);
          border: 1px solid rgba(0, 255, 255, 0.4);
          border-radius: 12px;
          padding: 32px 48px;
          text-align: center;
          max-width: 600px;
          width: 90%;
          backdrop-filter: blur(8px);
          display: none;
        }
        .ui-panel.show { display: block; }

        .ui-title {
          font-size: 52px;
          font-weight: bold;
          color: #00ffff;
          text-shadow: 0 0 20px rgba(0,255,255,0.5), 0 0 40px rgba(0,255,255,0.2);
          margin-bottom: 4px;
          letter-spacing: 4px;
        }
        .ui-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 30px;
          letter-spacing: 6px;
        }

        .ui-btn {
          display: block;
          width: 80%;
          margin: 10px auto;
          padding: 12px 24px;
          background: rgba(0, 255, 255, 0.08);
          border: 1px solid rgba(0, 255, 255, 0.4);
          border-radius: 6px;
          color: #00ffff;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 2px;
        }
        .ui-btn:hover, .ui-btn.focused {
          background: rgba(0, 255, 255, 0.2);
          border-color: #00ffff;
          box-shadow: 0 0 15px rgba(0,255,255,0.3);
        }
        .ui-btn.primary {
          background: rgba(0, 255, 255, 0.15);
          font-size: 20px;
          padding: 14px 28px;
        }
        .ui-btn.primary:hover, .ui-btn.primary.focused {
          background: rgba(0, 255, 255, 0.3);
        }

        .ui-section-title {
          font-size: 22px;
          color: #00ffff;
          margin-bottom: 20px;
          text-shadow: 0 0 10px rgba(0,255,255,0.3);
        }

        .ball-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin: 16px 0;
        }
        .ball-card {
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid rgba(0, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ball-card:hover, .ball-card.selected, .ball-card.focused {
          border-color: #00ffff;
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 0 0 10px rgba(0,255,255,0.2);
        }
        .ball-name {
          color: #ffffff;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .ball-desc {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }
        .ball-color-dot {
          width: 24px; height: 24px;
          border-radius: 50%;
          margin: 6px auto;
          box-shadow: 0 0 8px currentColor;
        }

        .theme-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 16px 0;
        }
        .theme-card {
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid rgba(0, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .theme-card:hover, .theme-card.selected, .theme-card.focused {
          border-color: #00ffff;
          background: rgba(0, 255, 255, 0.1);
        }

        .game-over-score {
          font-size: 72px;
          color: #00ffff;
          font-weight: bold;
          text-shadow: 0 0 30px rgba(0,255,255,0.5);
          margin: 10px 0;
        }
        .game-over-label {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 4px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          padding: 4px 20px;
        }
        .stat-value { color: #00ffff; }

        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
        }
        .settings-slider {
          width: 120px;
          accent-color: #00ffff;
        }

        .controls-hint {
          font-size: 10px;
          color: rgba(0, 255, 255, 0.4);
          margin-top: 20px;
          line-height: 1.6;
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
        }
        .leaderboard-table th, .leaderboard-table td {
          padding: 6px 12px;
          border-bottom: 1px solid rgba(0,255,255,0.15);
          color: rgba(255,255,255,0.7);
          font-size: 13px;
        }
        .leaderboard-table th {
          color: rgba(0,255,255,0.6);
          font-size: 11px;
        }
        .leaderboard-gold { color: #ffd700 !important; }
        .leaderboard-silver { color: #c0c0c0 !important; }
        .leaderboard-bronze { color: #cd7f32 !important; }

        .achievement-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          margin: 12px 0;
          max-height: 300px;
          overflow-y: auto;
        }
        .achievement-card {
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid rgba(0, 255, 255, 0.15);
          border-radius: 6px;
          padding: 8px;
          text-align: left;
        }
        .achievement-card.unlocked {
          border-color: rgba(0, 255, 255, 0.4);
          background: rgba(0, 255, 255, 0.05);
        }
        .achievement-name {
          color: #ffffff;
          font-size: 12px;
          font-weight: bold;
        }
        .achievement-desc {
          color: rgba(255,255,255,0.4);
          font-size: 10px;
        }
        .achievement-card.unlocked .achievement-name { color: #00ffff; }

        .mp-scoreboard {
          position: fixed;
          top: 10px; right: 10px;
          background: rgba(0,8,16,0.85);
          border: 1px solid rgba(0,255,255,0.3);
          border-radius: 8px;
          padding: 8px 14px;
          z-index: 250;
          font-family: 'Courier New', monospace;
          min-width: 160px;
          display: none;
        }
        .mp-scoreboard.show { display: block; }
        .mp-score-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }
        .mp-score-row.active {
          color: #ffffff;
          font-weight: bold;
        }
        .mp-score-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .mp-score-value {
          color: #00ffff;
          font-size: 14px;
        }

        .cosmic-banner {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,8,16,0.95);
          border: 2px solid rgba(255,100,0,0.6);
          border-radius: 16px;
          padding: 24px 48px;
          text-align: center;
          z-index: 300;
          font-family: 'Courier New', monospace;
          animation: cosmicPulse 1.5s ease-in-out;
          pointer-events: none;
        }
        @keyframes cosmicPulse {
          0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%,-50%) scale(1.1); opacity: 1; }
          80% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0.9); opacity: 0; }
        }
        .cosmic-icon { font-size: 48px; margin-bottom: 8px; }
        .cosmic-name { font-size: 24px; color: #ff6600; font-weight: bold; }
        .cosmic-desc { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px; }

        .turn-banner {
          position: fixed;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,8,16,0.92);
          border: 2px solid rgba(0,255,255,0.5);
          border-radius: 16px;
          padding: 20px 48px;
          text-align: center;
          z-index: 280;
          font-family: 'Courier New', monospace;
          animation: turnSlide 2s ease-in-out;
          pointer-events: none;
        }
        @keyframes turnSlide {
          0% { transform: translate(-50%,-100%); opacity: 0; }
          15% { transform: translate(-50%,-50%); opacity: 1; }
          85% { transform: translate(-50%,-50%); opacity: 1; }
          100% { transform: translate(-50%,100%); opacity: 0; }
        }
        .turn-name { font-size: 28px; font-weight: bold; }
        .turn-subtitle { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }

        .replay-skip {
          position: fixed;
          bottom: 40px;
          right: 40px;
          background: rgba(0,8,16,0.8);
          border: 1px solid rgba(0,255,255,0.4);
          border-radius: 8px;
          padding: 10px 24px;
          color: #00ffff;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          cursor: pointer;
          z-index: 290;
          transition: all 0.2s;
        }
        .replay-skip:hover {
          background: rgba(0,255,255,0.15);
          border-color: #00ffff;
        }

        .unlock-popup {
          position: fixed;
          bottom: 20%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,8,16,0.95);
          border: 2px solid rgba(255,215,0,0.6);
          border-radius: 12px;
          padding: 16px 32px;
          text-align: center;
          z-index: 310;
          font-family: 'Courier New', monospace;
          animation: unlockPop 3s ease-in-out forwards;
          pointer-events: none;
        }
        @keyframes unlockPop {
          0% { transform: translateX(-50%) scale(0); opacity: 0; }
          15% { transform: translateX(-50%) scale(1.15); opacity: 1; }
          25% { transform: translateX(-50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        .unlock-icon { font-size: 36px; }
        .unlock-title { color: #ffd700; font-size: 16px; font-weight: bold; }
        .unlock-desc { color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px; }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          margin-top: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ffff, #00ff88);
          border-radius: 3px;
          transition: width 0.3s;
        }

        .ball-card.locked {
          opacity: 0.4;
          cursor: default;
        }
        .ball-card.locked:hover {
          border-color: rgba(0,255,255,0.2);
          background: rgba(0,20,40,0.6);
          box-shadow: none;
        }
      </style>
      <div class="ui-panel" id="ui-title-screen"></div>
      <div class="ui-panel" id="ui-ball-select"></div>
      <div class="ui-panel" id="ui-settings"></div>
      <div class="ui-panel" id="ui-game-over"></div>
      <div class="ui-panel" id="ui-pause"></div>
      <div class="ui-panel" id="ui-leaderboard"></div>
      <div class="ui-panel" id="ui-achievements"></div>
      <div class="ui-panel" id="ui-challenges"></div>
      <div class="ui-panel" id="ui-challenge-result"></div>
      <div class="ui-panel" id="ui-statistics"></div>
      <div class="ui-panel" id="ui-practice"></div>
      <div class="ui-panel" id="ui-multiplayer-setup"></div>
      <div class="ui-panel" id="ui-multiplayer-over"></div>
      <div class="ui-panel" id="ui-cosmic-event"></div>
      <div class="ui-panel" id="ui-ball-unlocks"></div>
      <div class="ui-panel" id="ui-turn-banner"></div>
      <div class="ui-panel" id="ui-replay-prompt"></div>
    `;
    document.body.appendChild(this.overlay);
  }

  private showPanel(id: string) {
    this.hideAll();
    this.currentScreen = id;
    this.overlay.classList.add('active');
    const panel = document.getElementById(id);
    if (panel) panel.classList.add('show');
  }

  hideAll() {
    this.overlay.classList.remove('active');
    this.overlay.querySelectorAll('.ui-panel').forEach(p => p.classList.remove('show'));
    this.currentScreen = 'none';
  }

  getActiveScreen(): string { return this.currentScreen; }

  showTitleScreen() {
    const panel = document.getElementById('ui-title-screen')!;
    panel.innerHTML = `
      <div class="ui-title">ASTRO BOWL</div>
      <div class="ui-subtitle">HOLODECK BOWLING</div>
      <button class="ui-btn primary" onclick="window.__ui.startGame()">▶ START GAME</button>
      <button class="ui-btn" onclick="window.__ui.showMultiplayerSetup()">👥 MULTIPLAYER</button>
      <button class="ui-btn" onclick="window.__ui.startCosmicBowling()">🌌 COSMIC BOWLING</button>
      <button class="ui-btn" onclick="window.__ui.showPractice()">🎯 PRACTICE</button>
      <button class="ui-btn" onclick="window.__ui.showChallenges()">🏅 CHALLENGES</button>
      <button class="ui-btn" onclick="window.__ui.showBallSelect()">🎳 BALL SELECT</button>
      <button class="ui-btn" onclick="window.__ui.showSettings()">⚙ SETTINGS</button>
      <button class="ui-btn" onclick="window.__ui.showStatistics()">📊 STATISTICS</button>
      <button class="ui-btn" onclick="window.__ui.showLeaderboard()">🏆 LEADERBOARD</button>
      <button class="ui-btn" onclick="window.__ui.showAchievements()">⭐ ACHIEVEMENTS</button>
      <button class="ui-btn" onclick="window.__ui.showUnlocks()">🔓 BALL COLLECTION</button>
      <button class="ui-btn" onclick="window.__ui.showTutorial()" style="opacity:0.6;font-size:13px">❓ HOW TO PLAY</button>
      <div class="controls-hint">
        VR: Grip to grab ball · Trigger to throw · Thumbstick to navigate<br>
        Browser: Click + drag to aim · Hold for power · Release to throw · WASD to move
      </div>
    `;

    (window as any).__ui = {
      startGame: () => this.onStartGame(),
      showBallSelect: () => this.showBallSelect('standard'),
      showSettings: () => this.showSettings(0.3, 0.6, 'neon_circuit'),
      showLeaderboard: () => this.onShowLeaderboard(),
      showAchievements: () => this.onShowAchievements(),
      showChallenges: () => this.showChallenges(),
      showStatistics: () => this.onShowStatistics(),
      showPractice: () => this.showPractice(),
      showTutorial: () => this.onShowTutorial(),
      showMultiplayerSetup: () => this.showMultiplayerSetup(),
      startCosmicBowling: () => this.onStartCosmicBowling(),
      showUnlocks: () => this.onShowUnlocks(),
    };
    this.showPanel('ui-title-screen');
  }

  showBallSelect(selectedBall: string) {
    const panel = document.getElementById('ui-ball-select')!;
    let cardsHtml = '';
    for (const [key, ball] of Object.entries(BALL_TYPES)) {
      const sel = key === selectedBall ? ' selected' : '';
      const colorHex = '#' + ball.color.getHexString();
      cardsHtml += `
        <div class="ball-card${sel}" onclick="window.__ballSelect('${key}')">
          <div class="ball-color-dot" style="background:${colorHex}; color:${colorHex}"></div>
          <div class="ball-name">${ball.name}</div>
          <div class="ball-desc">${ball.description}</div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="ui-section-title">SELECT BALL</div>
      <div class="ball-grid">${cardsHtml}</div>
      <button class="ui-btn primary" onclick="window.__ui.startGame()">▶ START</button>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;

    (window as any).__ballSelect = (key: string) => {
      this.onBallSelect(key);
      this.showBallSelect(key);
    };
    (window as any).__ui.backToTitle = () => this.showTitleScreen();

    this.showPanel('ui-ball-select');
  }

  showSettings(musicVol: number, sfxVol: number, theme: string) {
    const panel = document.getElementById('ui-settings')!;

    let themesHtml = '';
    for (const [key, t] of Object.entries(THEMES)) {
      const sel = key === theme ? ' selected' : '';
      const colorHex = '#' + t.primary.getHexString();
      themesHtml += `
        <div class="theme-card${sel}" onclick="window.__themeSelect('${key}')">
          <div style="width:20px;height:20px;border-radius:50%;background:${colorHex};margin:0 auto 6px;box-shadow:0 0 8px ${colorHex}"></div>
          <div style="color:#fff;font-size:12px">${t.name}</div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="ui-section-title">SETTINGS</div>
      <div class="settings-row">
        <span>Music Volume</span>
        <input type="range" class="settings-slider" min="0" max="100" value="${musicVol * 100}" oninput="window.__setMusic(this.value)">
      </div>
      <div class="settings-row">
        <span>SFX Volume</span>
        <input type="range" class="settings-slider" min="0" max="100" value="${sfxVol * 100}" oninput="window.__setSfx(this.value)">
      </div>
      <div style="margin-top:16px;color:rgba(255,255,255,0.6);font-size:13px">Lane Theme</div>
      <div class="theme-grid">${themesHtml}</div>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;

    (window as any).__setMusic = (val: string) => {
      const v = parseInt(val) / 100;
      musicVol = v;
      // Will be picked up by the app
      if ((window as any).__onMusicVolChange) (window as any).__onMusicVolChange(v);
    };
    (window as any).__setSfx = (val: string) => {
      const v = parseInt(val) / 100;
      sfxVol = v;
      if ((window as any).__onSfxVolChange) (window as any).__onSfxVolChange(v);
    };
    (window as any).__themeSelect = (key: string) => {
      this.onThemeSelect(key);
      this.showSettings(musicVol, sfxVol, key);
    };
    (window as any).__ui.backToTitle = () => this.showTitleScreen();

    this.showPanel('ui-settings');
  }

  showGameOver(score: number, stats: { strikes: number; spares: number; gutters: number; totalPins: number; maxStreak: number }) {
    const panel = document.getElementById('ui-game-over')!;
    const rating = score >= 300 ? '⭐ PERFECT GAME!' :
                   score >= 250 ? '🏆 AMAZING!' :
                   score >= 200 ? '🎯 GREAT!' :
                   score >= 150 ? '👍 GOOD GAME' : '🎳 KEEP BOWLING';

    panel.innerHTML = `
      <div class="ui-section-title">GAME OVER</div>
      <div class="game-over-label">FINAL SCORE</div>
      <div class="game-over-score">${score}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:16px;margin-bottom:16px">${rating}</div>
      <div class="stat-row"><span>Strikes</span><span class="stat-value">${stats.strikes}</span></div>
      <div class="stat-row"><span>Spares</span><span class="stat-value">${stats.spares}</span></div>
      <div class="stat-row"><span>Gutters</span><span class="stat-value">${stats.gutters}</span></div>
      <div class="stat-row"><span>Total Pins</span><span class="stat-value">${stats.totalPins}</span></div>
      <div class="stat-row"><span>Best Streak</span><span class="stat-value">${stats.maxStreak}</span></div>
      <button class="ui-btn primary" onclick="window.__ui.playAgain()">▶ PLAY AGAIN</button>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← MAIN MENU</button>
    `;

    (window as any).__ui.playAgain = () => this.onPlayAgain();
    (window as any).__ui.backToTitle = () => this.showTitleScreen();

    this.showPanel('ui-game-over');
  }

  showPause() {
    const panel = document.getElementById('ui-pause')!;
    panel.innerHTML = `
      <div class="ui-section-title">PAUSED</div>
      <button class="ui-btn primary" onclick="window.__ui.resume()">▶ RESUME</button>
      <button class="ui-btn" onclick="window.__ui.quit()">✕ QUIT TO MENU</button>
    `;

    (window as any).__ui.resume = () => this.onResume();
    (window as any).__ui.quit = () => this.onQuit();

    this.showPanel('ui-pause');
  }

  showLeaderboard(scores: { score: number; date: string }[]) {
    const panel = document.getElementById('ui-leaderboard')!;
    let rows = '';
    scores.slice(0, 10).forEach((entry, i) => {
      const medal = i === 0 ? 'leaderboard-gold' : i === 1 ? 'leaderboard-silver' : i === 2 ? 'leaderboard-bronze' : '';
      rows += `<tr class="${medal}"><td>${i + 1}</td><td>${entry.score}</td><td>${entry.date}</td></tr>`;
    });

    if (scores.length === 0) {
      rows = '<tr><td colspan="3" style="color:rgba(255,255,255,0.4)">No games yet</td></tr>';
    }

    panel.innerHTML = `
      <div class="ui-section-title">🏆 LEADERBOARD</div>
      <table class="leaderboard-table">
        <tr><th>#</th><th>Score</th><th>Date</th></tr>
        ${rows}
      </table>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;
    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-leaderboard');
  }

  showAchievements(achievements: { id: string; name: string; description: string; unlocked: boolean }[]) {
    const panel = document.getElementById('ui-achievements')!;
    let cardsHtml = '';
    for (const ach of achievements) {
      const cls = ach.unlocked ? ' unlocked' : '';
      const icon = ach.unlocked ? '✓' : '🔒';
      cardsHtml += `
        <div class="achievement-card${cls}">
          <div class="achievement-name">${icon} ${ach.name}</div>
          <div class="achievement-desc">${ach.description}</div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="ui-section-title">⭐ ACHIEVEMENTS</div>
      <div class="achievement-grid">${cardsHtml}</div>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;
    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-achievements');
  }

  showChallenges(bestScores: Record<string, number> = {}) {
    const panel = document.getElementById('ui-challenges')!;
    let cardsHtml = '';
    for (const [key, challenge] of Object.entries(CHALLENGES)) {
      const best = bestScores[key];
      const bestStr = best !== undefined ? `Best: ${best}/${challenge.frames}` : 'Not attempted';
      cardsHtml += `
        <div class="ball-card" onclick="window.__startChallenge('${key}')">
          <div class="ball-name">${challenge.name}</div>
          <div class="ball-desc">${challenge.description}</div>
          <div class="ball-desc" style="color:rgba(0,255,255,0.5);margin-top:4px">${bestStr}</div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="ui-section-title">🏅 CHALLENGES</div>
      <div class="ball-grid">${cardsHtml}</div>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;

    (window as any).__startChallenge = (type: string) => {
      this.onStartChallenge(type as ChallengeType);
    };
    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-challenges');
  }

  showChallengeResult(success: boolean, challengeName: string, stats: { successes: number; total: number; time: number }) {
    const panel = document.getElementById('ui-challenge-result')!;
    const emoji = success ? '🏆' : '💪';
    const msg = success ? 'CHALLENGE COMPLETE!' : 'KEEP TRYING!';
    const timeStr = stats.time > 0 ? `<div class="stat-row"><span>Time</span><span class="stat-value">${Math.floor(stats.time)}s</span></div>` : '';

    panel.innerHTML = `
      <div class="ui-section-title">${emoji} ${msg}</div>
      <div style="font-size:20px;color:#ffffff;margin-bottom:16px">${challengeName}</div>
      <div class="stat-row"><span>Successes</span><span class="stat-value">${stats.successes} / ${stats.total}</span></div>
      ${timeStr}
      <button class="ui-btn primary" onclick="window.__ui.backToTitle()">← MAIN MENU</button>
    `;

    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-challenge-result');
  }

  showStatistics(
    overall: { totalGames: number; avgScore: number; bestScore: number; worstScore: number;
      totalStrikes: number; totalSpares: number; totalGutters: number; longestStreak: number;
      perfectGames: number; cleanGames: number; gamesOver200: number; strikeRate: number;
      spareRate: number; recentTrend: number[]; ballTypeStats: Record<string, { gamesPlayed: number; avgScore: number; bestScore: number }> },
    recentGames: { date: string; score: number; strikes: number; spares: number; ballType: string }[],
    trend: string,
  ) {
    const panel = document.getElementById('ui-statistics')!;

    const trendEmoji = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : trend === 'stable' ? '➡️' : '🆕';
    const trendText = trend === 'improving' ? 'Improving!' : trend === 'declining' ? 'Declining' : trend === 'stable' ? 'Stable' : 'Need more games';

    // Score trend sparkline (simple ASCII bar chart)
    let trendChart = '';
    if (overall.recentTrend.length > 0) {
      const max = Math.max(...overall.recentTrend, 1);
      trendChart = '<div style="display:flex;align-items:flex-end;height:50px;gap:3px;margin:8px auto;justify-content:center">';
      for (const score of overall.recentTrend) {
        const h = Math.max(4, (score / max) * 45);
        trendChart += `<div style="width:12px;height:${h}px;background:rgba(0,255,255,0.4);border-radius:2px" title="${score}"></div>`;
      }
      trendChart += '</div>';
    }

    // Ball type breakdown
    let ballStats = '';
    for (const [key, bs] of Object.entries(overall.ballTypeStats)) {
      if (bs.gamesPlayed > 0) {
        ballStats += `<div class="stat-row"><span>${key}</span><span class="stat-value">${bs.gamesPlayed} games · avg ${bs.avgScore} · best ${bs.bestScore}</span></div>`;
      }
    }

    // Recent games
    let recentHtml = '';
    for (const game of recentGames) {
      recentHtml += `<div class="stat-row"><span>${game.score} pts</span><span class="stat-value">${game.strikes}X ${game.spares}/ · ${game.ballType}</span></div>`;
    }

    panel.innerHTML = `
      <div class="ui-section-title">📊 STATISTICS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:12px">
        <div class="stat-row"><span>Games</span><span class="stat-value">${overall.totalGames}</span></div>
        <div class="stat-row"><span>Average</span><span class="stat-value">${overall.avgScore}</span></div>
        <div class="stat-row"><span>Best</span><span class="stat-value">${overall.bestScore}</span></div>
        <div class="stat-row"><span>200+ Games</span><span class="stat-value">${overall.gamesOver200}</span></div>
        <div class="stat-row"><span>Strike Rate</span><span class="stat-value">${overall.strikeRate}%</span></div>
        <div class="stat-row"><span>Spare Rate</span><span class="stat-value">${overall.spareRate}%</span></div>
        <div class="stat-row"><span>Best Streak</span><span class="stat-value">${overall.longestStreak}</span></div>
        <div class="stat-row"><span>Perfect Games</span><span class="stat-value">${overall.perfectGames}</span></div>
        <div class="stat-row"><span>Clean Games</span><span class="stat-value">${overall.cleanGames}</span></div>
        <div class="stat-row"><span>Trend</span><span class="stat-value">${trendEmoji} ${trendText}</span></div>
      </div>
      ${trendChart ? `<div style="color:rgba(0,255,255,0.5);font-size:11px;margin-bottom:4px">RECENT SCORES</div>${trendChart}` : ''}
      ${ballStats ? `<div style="color:rgba(0,255,255,0.5);font-size:11px;margin-top:8px">BY BALL TYPE</div>${ballStats}` : ''}
      ${recentHtml ? `<div style="color:rgba(0,255,255,0.5);font-size:11px;margin-top:8px">RECENT GAMES</div>${recentHtml}` : ''}
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;
    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-statistics');
  }

  showPractice() {
    const panel = document.getElementById('ui-practice')!;
    const presets = [
      { key: 'full', name: 'Full Rack', desc: 'All 10 pins', icon: '🎳' },
      { key: 'left_side', name: 'Left Side', desc: 'Pins 1-2-4-5-7-8', icon: '◀' },
      { key: 'right_side', name: 'Right Side', desc: 'Pins 1-3-5-6-9-10', icon: '▶' },
      { key: 'back_row', name: 'Back Row', desc: 'Pins 7-8-9-10 only', icon: '⬆' },
      { key: '7_10_split', name: '7-10 Split', desc: 'The impossible split', icon: '↔' },
      { key: 'baby_split', name: 'Baby Split', desc: 'Pins 4-6', icon: '🔀' },
      { key: 'random', name: 'Random', desc: 'Surprise pin layout each roll', icon: '🎲' },
    ];

    let cardsHtml = '';
    for (const p of presets) {
      cardsHtml += `
        <div class="ball-card" onclick="window.__startPractice('${p.key}')">
          <div style="font-size:24px">${p.icon}</div>
          <div class="ball-name">${p.name}</div>
          <div class="ball-desc">${p.desc}</div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="ui-section-title">🎯 PRACTICE MODE</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:12px">Bowl endlessly without scoring — focus on technique</div>
      <div class="ball-grid">${cardsHtml}</div>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;

    (window as any).__startPractice = (key: string) => {
      this.onStartPractice(key);
    };
    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-practice');
  }

  // ── Multiplayer Setup ──────────────────────────────────────────
  showMultiplayerSetup() {
    const panel = document.getElementById('ui-multiplayer-setup')!;
    panel.innerHTML = `
      <div class="ui-section-title">👥 MULTIPLAYER</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:16px">
        Local turn-based bowling for 2-4 players
      </div>
      <div style="margin-bottom:12px">
        <div style="color:rgba(0,255,255,0.6);font-size:12px;margin-bottom:8px">NUMBER OF PLAYERS</div>
        <div style="display:flex;gap:10px;justify-content:center" id="mp-player-count">
          <button class="ui-btn" style="width:60px" onclick="window.__mpSetCount(2)">2</button>
          <button class="ui-btn" style="width:60px" onclick="window.__mpSetCount(3)">3</button>
          <button class="ui-btn" style="width:60px" onclick="window.__mpSetCount(4)">4</button>
        </div>
      </div>
      <div id="mp-names" style="margin:12px 0"></div>
      <button class="ui-btn primary" onclick="window.__mpStart()" id="mp-start-btn" style="display:none">▶ START GAME</button>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;

    let selectedCount = 0;
    (window as any).__mpSetCount = (n: number) => {
      selectedCount = n;
      const namesDiv = document.getElementById('mp-names')!;
      const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff88'];
      let html = '';
      for (let i = 0; i < n; i++) {
        html += `
          <div style="display:flex;align-items:center;gap:8px;margin:6px auto;max-width:300px">
            <div style="width:12px;height:12px;border-radius:50%;background:${colors[i]};box-shadow:0 0 6px ${colors[i]}"></div>
            <input type="text" id="mp-name-${i}" value="Player ${i + 1}"
              style="flex:1;background:rgba(0,20,40,0.6);border:1px solid rgba(0,255,255,0.3);
              border-radius:4px;padding:6px 10px;color:#fff;font-family:'Courier New',monospace;font-size:13px">
          </div>
        `;
      }
      namesDiv.innerHTML = html;
      document.getElementById('mp-start-btn')!.style.display = 'block';
    };

    (window as any).__mpStart = () => {
      if (selectedCount < 2) return;
      const names: string[] = [];
      for (let i = 0; i < selectedCount; i++) {
        const input = document.getElementById(`mp-name-${i}`) as HTMLInputElement;
        names.push(input?.value?.trim() || `Player ${i + 1}`);
      }
      this.onStartMultiplayer(selectedCount, names);
    };

    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-multiplayer-setup');
  }

  // ── Multiplayer Scoreboard (persistent overlay during game) ──
  private mpScoreboard: HTMLDivElement | null = null;

  showMultiplayerScoreboard(players: { name: string; color: string; score: number; isActive: boolean }[]) {
    if (!this.mpScoreboard) {
      this.mpScoreboard = document.createElement('div');
      this.mpScoreboard.className = 'mp-scoreboard';
      document.body.appendChild(this.mpScoreboard);
    }

    let html = '<div style="color:rgba(0,255,255,0.5);font-size:10px;letter-spacing:2px;margin-bottom:4px">SCOREBOARD</div>';
    for (const p of players) {
      const activeClass = p.isActive ? ' active' : '';
      html += `
        <div class="mp-score-row${activeClass}">
          <span><span class="mp-score-dot" style="background:${p.color}"></span>${p.name}</span>
          <span class="mp-score-value">${p.score}</span>
        </div>
      `;
    }
    this.mpScoreboard.innerHTML = html;
    this.mpScoreboard.classList.add('show');
  }

  hideMultiplayerScoreboard() {
    if (this.mpScoreboard) {
      this.mpScoreboard.classList.remove('show');
    }
  }

  // ── Multiplayer Turn Banner ──────────────────────────────────
  showTurnBanner(playerName: string, playerColor: string, frameNum: number) {
    // Create a temporary banner
    const banner = document.createElement('div');
    banner.className = 'turn-banner';
    banner.innerHTML = `
      <div class="turn-name" style="color:${playerColor}">${playerName}</div>
      <div class="turn-subtitle">Frame ${frameNum}</div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2200);
  }

  // ── Multiplayer Game Over ──────────────────────────────────────
  showMultiplayerGameOver(rankings: { name: string; color: string; score: number; strikes: number; spares: number }[]) {
    this.hideMultiplayerScoreboard();
    const panel = document.getElementById('ui-multiplayer-over')!;

    let rankingsHtml = '';
    const medals = ['🥇', '🥈', '🥉', ''];
    rankings.forEach((p, i) => {
      const medal = medals[i] || '';
      rankingsHtml += `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 16px;margin:4px 0;
          background:rgba(0,20,40,${i === 0 ? '0.4' : '0.2'});border-radius:6px;
          border:1px solid ${i === 0 ? 'rgba(255,215,0,0.4)' : 'rgba(0,255,255,0.15)'}">
          <span style="font-size:24px">${medal}</span>
          <span style="color:${p.color};font-weight:bold;font-size:16px;flex:1;text-align:left">${p.name}</span>
          <span style="color:#00ffff;font-size:24px;font-weight:bold">${p.score}</span>
          <span style="color:rgba(255,255,255,0.4);font-size:11px">${p.strikes}X ${p.spares}/</span>
        </div>
      `;
    });

    panel.innerHTML = `
      <div class="ui-section-title">🏆 FINAL STANDINGS</div>
      ${rankingsHtml}
      <button class="ui-btn primary" onclick="window.__ui.playAgain()" style="margin-top:16px">▶ PLAY AGAIN</button>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← MAIN MENU</button>
    `;

    (window as any).__ui.playAgain = () => this.onPlayAgain();
    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-multiplayer-over');
  }

  // ── Cosmic Event Banner ──────────────────────────────────────
  showCosmicEventBanner(event: CosmicEvent) {
    const banner = document.createElement('div');
    banner.className = 'cosmic-banner';
    banner.innerHTML = `
      <div class="cosmic-icon">${event.icon}</div>
      <div class="cosmic-name">${event.name}</div>
      <div class="cosmic-desc">${event.description}</div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2500);
  }

  // ── Replay Controls ──────────────────────────────────────────
  private replaySkipBtn: HTMLButtonElement | null = null;

  showReplayControls() {
    if (this.replaySkipBtn) this.replaySkipBtn.remove();
    this.replaySkipBtn = document.createElement('button');
    this.replaySkipBtn.className = 'replay-skip';
    this.replaySkipBtn.textContent = '⏭ SKIP REPLAY';
    this.replaySkipBtn.onclick = () => {
      this.onSkipReplay();
      this.hideReplayControls();
    };
    document.body.appendChild(this.replaySkipBtn);
  }

  hideReplayControls() {
    if (this.replaySkipBtn) {
      this.replaySkipBtn.remove();
      this.replaySkipBtn = null;
    }
  }

  // ── Ball Unlock Popup ──────────────────────────────────────────
  showBallUnlockPopup(ballName: string, ballColor: string) {
    const popup = document.createElement('div');
    popup.className = 'unlock-popup';
    popup.innerHTML = `
      <div class="unlock-icon">🎳</div>
      <div class="unlock-title">NEW BALL UNLOCKED!</div>
      <div class="unlock-desc" style="color:${ballColor};font-size:16px;font-weight:bold;margin-top:6px">${ballName}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3500);
  }

  // ── Ball Collection / Unlock Screen ──────────────────────────
  showBallUnlocks(unlockInfo: { ballType: string; unlocked: boolean; description: string; progress: number }[]) {
    const panel = document.getElementById('ui-ball-unlocks')!;

    let cardsHtml = '';
    for (const info of unlockInfo) {
      const ball = BALL_TYPES[info.ballType];
      if (!ball) continue;
      const colorHex = '#' + ball.color.getHexString();
      const lockedClass = info.unlocked ? '' : ' locked';
      const statusIcon = info.unlocked ? '✓' : '🔒';

      cardsHtml += `
        <div class="ball-card${lockedClass}">
          <div class="ball-color-dot" style="background:${info.unlocked ? colorHex : '#333'}; color:${info.unlocked ? colorHex : '#333'}"></div>
          <div class="ball-name">${statusIcon} ${ball.name}</div>
          <div class="ball-desc">${info.description}</div>
          ${!info.unlocked ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width:${info.progress}%"></div>
            </div>
            <div style="color:rgba(0,255,255,0.4);font-size:10px;margin-top:2px">${info.progress}%</div>
          ` : '<div style="color:rgba(0,255,255,0.6);font-size:10px;margin-top:4px">UNLOCKED ✓</div>'}
        </div>
      `;
    }

    if (unlockInfo.length === 0) {
      cardsHtml = '<div style="color:rgba(255,255,255,0.4);padding:20px">No ball data available</div>';
    }

    panel.innerHTML = `
      <div class="ui-section-title">🔓 BALL COLLECTION</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:12px">
        Unlock new balls by playing and achieving milestones
      </div>
      <div class="ball-grid">${cardsHtml}</div>
      <button class="ui-btn" onclick="window.__ui.backToTitle()">← BACK</button>
    `;

    (window as any).__ui.backToTitle = () => this.showTitleScreen();
    this.showPanel('ui-ball-unlocks');
  }
}
