/**
 * Astro Bowl VR — Main Entry Point
 * Holodeck bowling game: dual-runtime (VR + browser), 10-pin scoring,
 * 5 ball types, 3 themes, procedural audio, achievements, leaderboard.
 */
import { World, Vector3, Color } from '@iwsdk/core';
import { GameManager, GameState } from './game';
import { BallController, BallState, BALL_TYPES } from './ball';
import { PinManager } from './pins';
import { LaneBuilder, LANE } from './lane';
import { EnvironmentBuilder, THEMES } from './environment';
import { EffectsManager } from './effects';
import { AudioManager } from './audio';
import { HUDManager } from './hud';
import { UIManager } from './ui';
import { XRInputHandler } from './xrinput';
import { BrowserInputHandler } from './browserinput';
import { AchievementTracker } from './achievements';
import { LeaderboardManager } from './leaderboard';

// ── Bootstrap ──────────────────────────────────────────────────
const container = document.getElementById('scene-container')!;

const world = await World.create(container, {
  xr: { offer: 'once' },
  input: { canvasPointerEvents: true },
  render: {
    near: 0.01,
    far: 200,
    camera: {
      position: [0, 1.7, 1.5],
      lookAt: [0, 0.5, -10],
    },
  },
  features: {
    grabbing: false,
    locomotion: false,
    physics: false,
  },
});

// ── Systems Init ───────────────────────────────────────────────
const gameManager = new GameManager();
let currentTheme = 'neon_circuit';
const themeColors = THEMES[currentTheme];

const environment = new EnvironmentBuilder(currentTheme);
world.scene.add(environment.group);

const lane = new LaneBuilder(themeColors.primary, themeColors.secondary, themeColors.accent);
world.scene.add(lane.group);

const pinManager = new PinManager(themeColors.primary, themeColors.accent);
world.scene.add(pinManager.group);

let ball = new BallController('standard');
world.scene.add(ball.group);

const effects = new EffectsManager();
world.scene.add(effects.group);

const audio = new AudioManager();
const hud = new HUDManager();
const ui = new UIManager();
const achievements = new AchievementTracker();
const leaderboard = new LeaderboardManager();

// Canvas for browser input
const canvas = container.querySelector('canvas') as HTMLCanvasElement;
const xrInput = new XRInputHandler(world);
const browserInput = canvas ? new BrowserInputHandler(world, canvas) : null;

// ── State Variables ────────────────────────────────────────────
let lastTime = performance.now() / 1000;
let ballThrown = false;
let waitingForSettle = false;
let scoreDisplayTimer = 0;
let frameTransitionTimer = 0;
let pinsKnockedThisRoll = 0;
let isXRSession = false;
let musicVolume = 0.3;
let sfxVolume = 0.6;

// ── Helper: apply theme ────────────────────────────────────────
function applyTheme(themeName: string) {
  const theme = THEMES[themeName];
  if (!theme) return;
  currentTheme = themeName;
  environment.applyTheme(themeName);
  // Lane and pins use fixed colors from initial creation;
  // for a theme change to fully propagate we'd rebuild them,
  // but the environment change gives the primary visual shift.
}

// ── Helper: reset for new frame/roll ───────────────────────────
function prepareForRoll() {
  ball.resetToReturn();
  ballThrown = false;
  waitingForSettle = false;
  pinsKnockedThisRoll = 0;
  hud.hidePowerBar();

  // Update HUD
  hud.updateScorecard(gameManager.frames, gameManager.currentFrame);
  hud.updateFrameIndicator(gameManager.currentFrame, gameManager.currentRoll, ball.ballType.name);
  hud.updatePinDisplay(gameManager.pinsStanding);
  hud.updateTotal(gameManager.totalScore);

  gameManager.setState(GameState.AIMING);
}

// ── Helper: throw the ball ─────────────────────────────────────
function throwBall(velocity: Vector3) {
  if (gameManager.state !== GameState.AIMING && gameManager.state !== GameState.THROWING) return;

  ball.throw(velocity);
  ballThrown = true;
  gameManager.setState(GameState.BALL_ROLLING);

  audio.init().then(() => {
    audio.startRollingSound();
    audio.playThrowWhoosh(velocity.length());
  });

  hud.hidePowerBar();
}

// ── Helper: handle roll result ─────────────────────────────────
function handleRollResult(pinsDown: number) {
  const result = gameManager.recordRoll(pinsDown);

  // Audio and effects
  audio.init().then(() => {
    if (result.isStrike) {
      audio.playStrikeFanfare();
      effects.playStrikeCelebration(new Vector3(0, 0.5, LANE.HEADPIN_Z));
      hud.showMessage('STRIKE!', '🎳', 2500);

      if (gameManager.stats.currentStreak >= 3) {
        audio.playTurkeyCelebration();
        effects.playTurkeyCelebration(new Vector3(0, 1, LANE.HEADPIN_Z));
        hud.showMessage('TURKEY!', `${gameManager.stats.currentStreak} strikes in a row!`, 3000);
      }

      achievements.recordStrike();
    } else if (result.isSpare) {
      audio.playSpareChime();
      effects.playSpareCelebration(new Vector3(0, 0.5, LANE.HEADPIN_Z));
      hud.showMessage('SPARE!', '/', 2000);
      achievements.recordSpare();
    } else if (pinsDown === 0) {
      audio.playGutterSad();
      hud.showMessage('GUTTER', '', 1500);
      achievements.recordGutter();
    } else {
      achievements.recordOpen();
    }

    if (pinsDown > 0) {
      audio.playPinScatter(pinsDown);
      effects.playPinHitEffect(new Vector3(0, 0.3, LANE.HEADPIN_Z), pinsDown / 10);
    }
  });

  // Update HUD
  hud.updateScorecard(gameManager.frames, gameManager.currentFrame);
  hud.updateTotal(gameManager.totalScore);

  if (result.gameOver) {
    // Game complete
    gameManager.setState(GameState.SCORE_DISPLAY);
    scoreDisplayTimer = 3;
  } else if (result.frameComplete) {
    // Frame complete, transition
    gameManager.setState(GameState.FRAME_TRANSITION);
    frameTransitionTimer = 1.5;
  } else {
    // Same frame, second roll — just clear fallen pins and re-aim
    gameManager.setState(GameState.FRAME_TRANSITION);
    frameTransitionTimer = 1.0;
  }
}

// ── Helper: end game ───────────────────────────────────────────
function endGame() {
  const score = gameManager.getTotalScore();
  const stats = gameManager.stats;

  // Save to leaderboard
  leaderboard.addScore({
    score,
    date: new Date().toLocaleDateString(),
    ballType: gameManager.ballType,
    theme: currentTheme,
    strikes: stats.strikes,
    spares: stats.spares,
  });

  // Check achievements
  achievements.recordGameComplete(score, stats);
  achievements.recordBallUsed(gameManager.ballType);
  achievements.recordThemePlayed(currentTheme);

  // Show game over screen
  hud.hide();
  audio.stopAmbientMusic();
  audio.stopRollingSound();
  ui.showGameOver(score, stats);
  gameManager.setState(GameState.GAME_OVER);
}

// ── Helper: start a new game ───────────────────────────────────
function startGame() {
  gameManager.reset();
  pinManager.resetPins();
  ball.resetToReturn();

  ui.hideAll();
  hud.show();

  audio.init().then(() => {
    audio.startAmbientMusic();
  });

  prepareForRoll();
}

// ── Wire up UI callbacks ───────────────────────────────────────
ui.onStartGame = () => startGame();
ui.onPlayAgain = () => startGame();
ui.onBallSelect = (ballType: string) => {
  gameManager.ballType = ballType;
  ball.setBallType(ballType);
};
ui.onThemeSelect = (theme: string) => {
  applyTheme(theme);
  gameManager.laneTheme = theme;
};
ui.onResume = () => {
  ui.hideAll();
  hud.show();
  gameManager.setState(gameManager.prevState);
};
ui.onQuit = () => {
  audio.stopAmbientMusic();
  audio.stopRollingSound();
  hud.hide();
  ui.showTitleScreen();
  gameManager.setState(GameState.TITLE);
};
ui.onShowLeaderboard = () => {
  const scores = leaderboard.getTopScores(10).map(e => ({ score: e.score, date: e.date }));
  ui.showLeaderboard(scores);
};
ui.onShowAchievements = () => {
  ui.showAchievements(achievements.getAll());
};

// ── Wire up achievements ───────────────────────────────────────
achievements.onUnlock = (ach) => {
  hud.showMessage('🏆 UNLOCKED', ach.name, 3000);
  effects.playAchievementEffect();
  audio.init().then(() => audio.playAchievementUnlock());
};

// ── Wire up XR input ───────────────────────────────────────────
xrInput.onGrabBall = () => {
  if (gameManager.state === GameState.AIMING) {
    ball.state = BallState.HELD;
    gameManager.setState(GameState.THROWING);
    audio.init().then(() => audio.playUIClick());
  }
};

xrInput.onReleaseBall = (velocity: Vector3) => {
  if (gameManager.state === GameState.THROWING) {
    throwBall(velocity);
  }
};

xrInput.onConfirm = () => {
  const screen = ui.getActiveScreen();
  if (screen === 'ui-title-screen') {
    startGame();
  } else if (screen !== 'none') {
    // Generic confirm on active UI
  } else if (gameManager.state === GameState.AIMING) {
    // Quick throw — default forward
    throwBall(new Vector3(0, 0, -8));
  }
};

xrInput.onBack = () => {
  const screen = ui.getActiveScreen();
  if (screen !== 'none' && screen !== 'ui-title-screen') {
    ui.showTitleScreen();
  } else if (gameManager.state === GameState.PLAYING ||
             gameManager.state === GameState.AIMING) {
    hud.hide();
    ui.showPause();
    gameManager.setState(GameState.PAUSED);
  }
};

xrInput.onPause = () => {
  if (gameManager.state === GameState.PAUSED) {
    ui.hideAll();
    hud.show();
    gameManager.setState(gameManager.prevState);
  } else if (gameManager.state !== GameState.TITLE &&
             gameManager.state !== GameState.GAME_OVER &&
             gameManager.state !== GameState.LOADING) {
    hud.hide();
    ui.showPause();
    gameManager.setState(GameState.PAUSED);
  }
};

// ── Wire up Browser input ──────────────────────────────────────
if (browserInput) {
  browserInput.onStartCharge = () => {
    if (gameManager.state === GameState.AIMING) {
      gameManager.setState(GameState.THROWING);
      hud.showPowerBar();
    }
  };

  browserInput.onPowerChange = (power: number) => {
    hud.setPower(power);
  };

  browserInput.onAimChange = (_aimX: number) => {
    // Could show aim indicator — handled by browser input drag
  };

  browserInput.onThrow = (velocity: Vector3) => {
    if (gameManager.state === GameState.THROWING || gameManager.state === GameState.AIMING) {
      throwBall(velocity);
    }
  };

  browserInput.onConfirm = () => {
    const screen = ui.getActiveScreen();
    if (screen === 'ui-title-screen') {
      startGame();
    }
  };

  browserInput.onPause = () => {
    if (gameManager.state === GameState.PAUSED) {
      ui.hideAll();
      hud.show();
      gameManager.setState(gameManager.prevState);
    } else if (gameManager.state !== GameState.TITLE &&
               gameManager.state !== GameState.GAME_OVER &&
               gameManager.state !== GameState.LOADING) {
      hud.hide();
      ui.showPause();
      gameManager.setState(GameState.PAUSED);
    }
  };

  browserInput.onBack = () => {
    const screen = ui.getActiveScreen();
    if (screen !== 'none' && screen !== 'ui-title-screen') {
      ui.showTitleScreen();
    }
  };
}

// ── Fog ────────────────────────────────────────────────────────
import { Fog } from '@iwsdk/core';
world.scene.fog = new Fog(themeColors.fog.getHex(), 15, 60);

// ── Show title screen ──────────────────────────────────────────
gameManager.setState(GameState.TITLE);
ui.showTitleScreen();

// ── Main game loop ─────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);

  const now = performance.now() / 1000;
  let dt = Math.min(now - lastTime, 0.05); // Cap at 50ms
  lastTime = now;

  // Apply slow motion from effects
  dt *= effects.timeScale;

  const state = gameManager.state;

  // ── Update input handlers ──
  if (state !== GameState.LOADING && state !== GameState.TITLE) {
    xrInput.update(dt);
    if (browserInput) browserInput.update(dt);
  }

  // ── Ball follow controller in VR when held ──
  if (state === GameState.THROWING && ball.state === BallState.HELD) {
    const controllerPos = xrInput.getControllerPosition();
    if (controllerPos) {
      ball.position.copy(controllerPos);
      ball.mesh.position.copy(controllerPos);
    }
  }

  // ── Ball rolling physics ──
  if (state === GameState.BALL_ROLLING) {
    const ballResult = ball.update(dt);

    // Update rolling sound based on speed
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.z ** 2);
    audio.updateRollingSound(speed);

    // Gutter event
    if (ballResult.inGutter && ball.state === BallState.IN_GUTTER) {
      if (!ball.inGutter) {
        audio.init().then(() => {
          audio.playGutterThud();
        });
        effects.playGutterEffect(ball.position.clone());
      }
    }

    // Ball reached pin area — apply collision
    if (ballResult.reachedPins && !waitingForSettle) {
      pinsKnockedThisRoll = pinManager.applyBallImpact(
        ball.position,
        ball.velocity,
        ball.getRadius(),
        ball.ballType.mass,
      );
      waitingForSettle = true;

      if (ball.inGutter) {
        // Gutter ball = 0 pins
        pinsKnockedThisRoll = 0;
      }

      // Slow motion for strikes
      if (pinsKnockedThisRoll >= 8) {
        effects.startSlowMotion(1.0, 0.3);
      }
    }

    // Ball done rolling — wait for pins to settle
    if (ballResult.done || (waitingForSettle && ball.position.z < LANE.HEADPIN_Z - 1)) {
      audio.stopRollingSound();
      audio.init().then(() => audio.playBallReturn());

      if (!waitingForSettle) {
        // Ball stopped before reaching pins (gutter or slow ball)
        pinsKnockedThisRoll = 0;
        waitingForSettle = true;
      }

      gameManager.setState(GameState.PIN_SETTLING);
    }
  }

  // ── Pin settling ──
  if (state === GameState.PIN_SETTLING) {
    pinManager.updatePhysics(dt);
    if (pinManager.allSettled) {
      // Count actual pins down
      const standing = pinManager.countStanding();
      const totalPinsAtStart = gameManager.currentRoll === 0 ? 10 : gameManager.getPinsStanding();
      const actualKnocked = totalPinsAtStart - standing;
      const finalPinsDown = Math.max(0, actualKnocked);

      // Update game state pinsStanding
      for (let i = 0; i < 10; i++) {
        if (pinManager.pins[i]) {
          gameManager.pinsStanding[i] = pinManager.pins[i].standing;
        }
      }

      hud.updatePinDisplay(gameManager.pinsStanding);
      handleRollResult(finalPinsDown);
    }
  }

  // ── Score display timer ──
  if (state === GameState.SCORE_DISPLAY) {
    scoreDisplayTimer -= dt;
    if (scoreDisplayTimer <= 0) {
      endGame();
    }
  }

  // ── Frame transition ──
  if (state === GameState.FRAME_TRANSITION) {
    frameTransitionTimer -= dt;
    if (frameTransitionTimer <= 0) {
      // Determine if we need full pin reset or just second ball
      const needsReset = gameManager.needsPinReset();
      if (needsReset) {
        pinManager.startSweep(true, () => {
          audio.init().then(() => audio.playSweepSound());
          prepareForRoll();
        });
      } else {
        // Second ball — keep remaining pins
        prepareForRoll();
      }
      // Move to aiming state immediately (prepareForRoll sets it)
      // but if sweep is running, we wait in FRAME_TRANSITION
      if (!needsReset) {
        // Already handled by prepareForRoll
      } else {
        // Sweep is async — set a temp state
        gameManager.setState(GameState.FRAME_TRANSITION);
      }
    }
  }

  // ── Update visual systems ──
  const time = now;
  environment.update(time);
  lane.update(time);
  effects.update(dt);

  // Pin physics always need updating for falling animation
  if (state !== GameState.PIN_SETTLING) {
    pinManager.updatePhysics(dt);
  }
}

// Start the loop
gameLoop();
