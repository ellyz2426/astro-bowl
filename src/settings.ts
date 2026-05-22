/**
 * Astro Bowl VR — Settings Manager
 * Persists user preferences: volume, sensitivity, accessibility options,
 * graphics quality, control hints.
 */

export interface Settings {
  // Audio
  musicVolume: number;     // 0–1
  sfxVolume: number;       // 0–1
  masterVolume: number;    // 0–1

  // Controls
  throwSensitivity: number; // 0.5–2.0
  aimSensitivity: number;   // 0.5–2.0
  invertAim: boolean;

  // Accessibility
  screenShake: boolean;     // Camera shake on/off (VR comfort)
  slowMotion: boolean;      // Slow-motion effects on/off
  colorblindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  highContrast: boolean;    // High-contrast UI text
  largeText: boolean;       // Larger HUD text

  // Graphics
  particleQuality: 'low' | 'medium' | 'high';
  trailEffects: boolean;
  ambientParticles: boolean;
  neighborLanes: boolean;

  // Gameplay
  autoAim: boolean;         // Gentle aim assist
  showTrajectory: boolean;  // Show predicted ball path
  tutorialHints: boolean;   // Show contextual hints

  // UI
  showPowerUpNotifications: boolean;
  showHazardWarnings: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.3,
  sfxVolume: 0.6,
  masterVolume: 0.8,
  throwSensitivity: 1.0,
  aimSensitivity: 1.0,
  invertAim: false,
  screenShake: true,
  slowMotion: true,
  colorblindMode: 'off',
  highContrast: false,
  largeText: false,
  particleQuality: 'high',
  trailEffects: true,
  ambientParticles: true,
  neighborLanes: true,
  autoAim: false,
  showTrajectory: true,
  tutorialHints: true,
  showPowerUpNotifications: true,
  showHazardWarnings: true,
};

const STORAGE_KEY = 'astro-bowl-settings';

export class SettingsManager {
  private settings: Settings;
  private listeners: Map<string, ((value: any) => void)[]> = new Map();

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  /**
   * Load settings from localStorage.
   */
  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.settings = { ...DEFAULT_SETTINGS, ...saved };
      }
    } catch {
      // Use defaults
    }
  }

  /**
   * Save settings to localStorage.
   */
  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Get a setting value.
   */
  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  /**
   * Set a setting value and persist.
   */
  set<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.settings[key] = value;
    this.save();
    this.notify(key, value);
  }

  /**
   * Get all settings.
   */
  getAll(): Settings {
    return { ...this.settings };
  }

  /**
   * Reset to defaults.
   */
  resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    // Notify all listeners
    for (const key of Object.keys(this.settings) as (keyof Settings)[]) {
      this.notify(key, this.settings[key]);
    }
  }

  /**
   * Register a listener for setting changes.
   */
  onChange(key: string, cb: (value: any) => void) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key)!.push(cb);
  }

  private notify(key: string, value: any) {
    const cbs = this.listeners.get(key);
    if (cbs) cbs.forEach(cb => cb(value));
  }

  /**
   * Build the settings screen HTML.
   */
  buildSettingsHTML(): string {
    const s = this.settings;
    return `
      <div class="settings-container">
        <h2 class="settings-title">⚙️ SETTINGS</h2>

        <div class="settings-section">
          <h3 class="section-title">🔊 Audio</h3>
          <div class="setting-row">
            <label>Master Volume</label>
            <input type="range" min="0" max="100" value="${Math.round(s.masterVolume * 100)}"
              class="setting-slider" data-key="masterVolume" data-scale="0.01">
            <span class="setting-value">${Math.round(s.masterVolume * 100)}%</span>
          </div>
          <div class="setting-row">
            <label>Music</label>
            <input type="range" min="0" max="100" value="${Math.round(s.musicVolume * 100)}"
              class="setting-slider" data-key="musicVolume" data-scale="0.01">
            <span class="setting-value">${Math.round(s.musicVolume * 100)}%</span>
          </div>
          <div class="setting-row">
            <label>Sound Effects</label>
            <input type="range" min="0" max="100" value="${Math.round(s.sfxVolume * 100)}"
              class="setting-slider" data-key="sfxVolume" data-scale="0.01">
            <span class="setting-value">${Math.round(s.sfxVolume * 100)}%</span>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">🎮 Controls</h3>
          <div class="setting-row">
            <label>Throw Sensitivity</label>
            <input type="range" min="50" max="200" value="${Math.round(s.throwSensitivity * 100)}"
              class="setting-slider" data-key="throwSensitivity" data-scale="0.01">
            <span class="setting-value">${Math.round(s.throwSensitivity * 100)}%</span>
          </div>
          <div class="setting-row">
            <label>Aim Sensitivity</label>
            <input type="range" min="50" max="200" value="${Math.round(s.aimSensitivity * 100)}"
              class="setting-slider" data-key="aimSensitivity" data-scale="0.01">
            <span class="setting-value">${Math.round(s.aimSensitivity * 100)}%</span>
          </div>
          <div class="setting-row">
            <label>Invert Aim</label>
            <div class="setting-toggle ${s.invertAim ? 'active' : ''}" data-key="invertAim"></div>
          </div>
          <div class="setting-row">
            <label>Auto-Aim Assist</label>
            <div class="setting-toggle ${s.autoAim ? 'active' : ''}" data-key="autoAim"></div>
          </div>
          <div class="setting-row">
            <label>Show Ball Trajectory</label>
            <div class="setting-toggle ${s.showTrajectory ? 'active' : ''}" data-key="showTrajectory"></div>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">♿ Accessibility</h3>
          <div class="setting-row">
            <label>Camera Shake</label>
            <div class="setting-toggle ${s.screenShake ? 'active' : ''}" data-key="screenShake"></div>
          </div>
          <div class="setting-row">
            <label>Slow-Motion Effects</label>
            <div class="setting-toggle ${s.slowMotion ? 'active' : ''}" data-key="slowMotion"></div>
          </div>
          <div class="setting-row">
            <label>High Contrast UI</label>
            <div class="setting-toggle ${s.highContrast ? 'active' : ''}" data-key="highContrast"></div>
          </div>
          <div class="setting-row">
            <label>Large Text</label>
            <div class="setting-toggle ${s.largeText ? 'active' : ''}" data-key="largeText"></div>
          </div>
          <div class="setting-row">
            <label>Colorblind Mode</label>
            <select class="setting-select" data-key="colorblindMode">
              <option value="off" ${s.colorblindMode === 'off' ? 'selected' : ''}>Off</option>
              <option value="protanopia" ${s.colorblindMode === 'protanopia' ? 'selected' : ''}>Protanopia (Red-Green)</option>
              <option value="deuteranopia" ${s.colorblindMode === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Green)</option>
              <option value="tritanopia" ${s.colorblindMode === 'tritanopia' ? 'selected' : ''}>Tritanopia (Blue-Yellow)</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">✨ Graphics</h3>
          <div class="setting-row">
            <label>Particle Quality</label>
            <select class="setting-select" data-key="particleQuality">
              <option value="low" ${s.particleQuality === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${s.particleQuality === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${s.particleQuality === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Ball Trail Effects</label>
            <div class="setting-toggle ${s.trailEffects ? 'active' : ''}" data-key="trailEffects"></div>
          </div>
          <div class="setting-row">
            <label>Ambient Particles</label>
            <div class="setting-toggle ${s.ambientParticles ? 'active' : ''}" data-key="ambientParticles"></div>
          </div>
          <div class="setting-row">
            <label>Neighboring Lanes</label>
            <div class="setting-toggle ${s.neighborLanes ? 'active' : ''}" data-key="neighborLanes"></div>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">📢 Notifications</h3>
          <div class="setting-row">
            <label>Power-Up Alerts</label>
            <div class="setting-toggle ${s.showPowerUpNotifications ? 'active' : ''}" data-key="showPowerUpNotifications"></div>
          </div>
          <div class="setting-row">
            <label>Hazard Warnings</label>
            <div class="setting-toggle ${s.showHazardWarnings ? 'active' : ''}" data-key="showHazardWarnings"></div>
          </div>
          <div class="setting-row">
            <label>Tutorial Hints</label>
            <div class="setting-toggle ${s.tutorialHints ? 'active' : ''}" data-key="tutorialHints"></div>
          </div>
        </div>

        <div class="settings-actions">
          <button class="settings-btn settings-reset">Reset to Defaults</button>
          <button class="settings-btn settings-back">Back</button>
        </div>
      </div>
    `;
  }

  /**
   * Get the settings CSS for the UI overlay.
   */
  static getCSS(): string {
    return `
      .settings-container {
        max-height: 70vh;
        overflow-y: auto;
        padding-right: 8px;
      }
      .settings-container::-webkit-scrollbar { width: 4px; }
      .settings-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 2px; }
      .settings-container::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.3); border-radius: 2px; }

      .settings-title {
        font-size: 28px;
        color: #00ffff;
        text-shadow: 0 0 15px rgba(0,255,255,0.4);
        margin-bottom: 20px;
        letter-spacing: 3px;
      }
      .settings-section {
        margin-bottom: 20px;
        border-top: 1px solid rgba(0,255,255,0.15);
        padding-top: 12px;
      }
      .section-title {
        font-size: 15px;
        color: rgba(255,255,255,0.7);
        margin-bottom: 10px;
        letter-spacing: 2px;
      }
      .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
        gap: 12px;
      }
      .setting-row label {
        color: rgba(255,255,255,0.8);
        font-size: 13px;
        flex: 1;
        white-space: nowrap;
      }
      .setting-slider {
        width: 120px;
        accent-color: #00ffff;
        cursor: pointer;
      }
      .setting-value {
        color: #00ffff;
        font-size: 12px;
        width: 40px;
        text-align: right;
      }
      .setting-toggle {
        width: 40px;
        height: 22px;
        border-radius: 11px;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.2);
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
      }
      .setting-toggle::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255,255,255,0.5);
        transition: all 0.2s;
      }
      .setting-toggle.active {
        background: rgba(0,255,255,0.3);
        border-color: rgba(0,255,255,0.5);
      }
      .setting-toggle.active::after {
        left: 20px;
        background: #00ffff;
      }
      .setting-select {
        background: rgba(0,8,16,0.8);
        border: 1px solid rgba(0,255,255,0.3);
        color: #00ffff;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        cursor: pointer;
      }
      .settings-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
        justify-content: center;
      }
      .settings-btn {
        padding: 8px 20px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .settings-reset {
        background: transparent;
        border: 1px solid rgba(255,100,100,0.5);
        color: #ff6666;
      }
      .settings-reset:hover { background: rgba(255,100,100,0.15); }
      .settings-back {
        background: transparent;
        border: 1px solid rgba(0,255,255,0.5);
        color: #00ffff;
      }
      .settings-back:hover { background: rgba(0,255,255,0.15); }
    `;
  }

  /**
   * Wire up event listeners for the settings UI.
   * Call after inserting the settings HTML into the DOM.
   */
  wireUI(container: HTMLElement) {
    // Sliders
    container.querySelectorAll('.setting-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const el = e.target as HTMLInputElement;
        const key = el.dataset.key as keyof Settings;
        const scale = parseFloat(el.dataset.scale || '1');
        const value = parseInt(el.value) * scale;
        this.set(key, value as any);
        const valueEl = el.parentElement?.querySelector('.setting-value');
        if (valueEl) valueEl.textContent = `${Math.round(value / scale)}%`;
      });
    });

    // Toggles
    container.querySelectorAll('.setting-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const key = (toggle as HTMLElement).dataset.key as keyof Settings;
        const current = this.get(key) as boolean;
        this.set(key, !current as any);
        toggle.classList.toggle('active');
      });
    });

    // Selects
    container.querySelectorAll('.setting-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const el = e.target as HTMLSelectElement;
        const key = el.dataset.key as keyof Settings;
        this.set(key, el.value as any);
      });
    });

    // Reset button
    container.querySelector('.settings-reset')?.addEventListener('click', () => {
      this.resetToDefaults();
      // Rebuild UI
      const settingsContainer = container.querySelector('.settings-container');
      if (settingsContainer) {
        settingsContainer.innerHTML = this.buildSettingsHTML();
        this.wireUI(container);
      }
    });
  }
}
