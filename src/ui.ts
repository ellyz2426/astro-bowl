/**
 * Astro Bowl VR — UI Screens
 * Title screen, game over, ball selection, settings, pause, achievements, leaderboard.
 */
import { BALL_TYPES } from './ball';
import { THEMES } from './environment';

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
      </style>
      <div class="ui-panel" id="ui-title-screen"></div>
      <div class="ui-panel" id="ui-ball-select"></div>
      <div class="ui-panel" id="ui-settings"></div>
      <div class="ui-panel" id="ui-game-over"></div>
      <div class="ui-panel" id="ui-pause"></div>
      <div class="ui-panel" id="ui-leaderboard"></div>
      <div class="ui-panel" id="ui-achievements"></div>
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
      <button class="ui-btn" onclick="window.__ui.showBallSelect()">🎳 BALL SELECT</button>
      <button class="ui-btn" onclick="window.__ui.showSettings()">⚙ SETTINGS</button>
      <button class="ui-btn" onclick="window.__ui.showLeaderboard()">🏆 LEADERBOARD</button>
      <button class="ui-btn" onclick="window.__ui.showAchievements()">⭐ ACHIEVEMENTS</button>
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

    (window as any).__setMusic = (val: string) => {};
    (window as any).__setSfx = (val: string) => {};
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
}
