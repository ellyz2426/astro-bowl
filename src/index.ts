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
import { AimIndicator } from './aim';
import { ChallengeManager, ChallengeType } from './challenges';
import { PracticeManager, PinPreset, PIN_PRESETS } from './practice';
import { StatisticsTracker, GameRecord } from './statistics';
import { TutorialManager } from './tutorial';
import { LaneEffects } from './laneeffects';
import { NeighboringLanes } from './neighbors';
import { MultiplayerManager } from './multiplayer';
import { CosmicBowlingManager } from './cosmic';
import { ReplayManager } from './replay';
import { BallUnlockManager } from './unlocks';

// ── Bootstrap ──────────────────────────────────────────────────
const container = document.getElementById('scene-container') as HTMLDivElement;

const world = await World.create(container, {
  xr: { offer: 'once' },
  render: {
    near: 0.01,
    far: 200,
  },
  features: {
    grabbing: false,
    locomotion: false,
    physics: false,
  },
} as any);

// ── Systems Init ───────────────────────────────────────────────
let gameManager = new GameManager();
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
const challengeManager = new ChallengeManager();

// New systems
const practiceManager = new PracticeManager();
const statistics = new StatisticsTracker();
const tutorial = new TutorialManager();
const laneEffects = new LaneEffects(themeColors.primary);
world.scene.add(laneEffects.group);
const neighbors = new NeighboringLanes(themeColors.primary, themeColors.secondary);
world.scene.add(neighbors.group);

// New round 3 systems
const multiplayer = new MultiplayerManager();
const cosmic = new CosmicBowlingManager();
world.scene.add(cosmic.group);
const replay = new ReplayManager();
world.scene.add(replay.group);
const ballUnlocks = new BallUnlockManager();

// Canvas for browser input
const canvas = container.querySelector('canvas') as HTMLCanvasElement;
const xrInput = new XRInputHandler(world);
const browserInput = canvas ? new BrowserInputHandler(world, canvas) : null;
const aimIndicator = new AimIndicator(themeColors.primary);
world.scene.add(aimIndicator.group);

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
let gutterEventFired = false;
let challengeActive = false;
let practiceActive = false;
let tutorialShownThisSession = false;
let multiplayerActive = false;
let cosmicActive = false;
let replayPlaying = false;

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
  gutterEventFired = false;
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

  // Apply cosmic modifiers if active
  let finalVelocity = velocity;
  if (cosmicActive && cosmic.active) {
    finalVelocity = cosmic.modifyThrowVelocity(velocity);
  }

  ball.throw(finalVelocity);
  ballThrown = true;
  gameManager.setState(GameState.BALL_ROLLING);
  aimIndicator.hide();
  laneEffects.activateSpeedStrips();
  laneEffects.clearArrowHighlights();

  // Start replay recording
  replay.startRecording();

  audio.init().then(() => {
    audio.startRollingSound();
    audio.playThrowWhoosh(finalVelocity.length());
  });

  hud.hidePowerBar();

  // Notify tutorial
  tutorial.notifyAction('throw');
}

// ── Helper: handle roll result ─────────────────────────────────
function handleRollResult(pinsDown: number) {
  const result = gameManager.recordRoll(pinsDown);

  // Stop replay recording and check if it qualifies
  const qualifiesForReplay = replay.stopRecording(pinsDown);

  // Audio and effects
  audio.init().then(() => {
    if (result.isStrike) {
      audio.playStrikeFanfare();
      audio.playCrowdCheer(1.5);
      effects.playStrikeCelebration(new Vector3(0, 0.5, LANE.HEADPIN_Z));
      laneEffects.spawnImpactRing(new Vector3(0, 0, LANE.HEADPIN_Z), new Color(0xff4444));
      hud.showMessage('STRIKE!', '🎳', 2500);

      if (gameManager.stats.currentStreak >= 3) {
        audio.playTurkeyCelebration();
        effects.playTurkeyCelebration(new Vector3(0, 1, LANE.HEADPIN_Z));
        hud.showMessage('TURKEY!', `${gameManager.stats.currentStreak} strikes in a row!`, 3000);
      }

      achievements.recordStrike();
    } else if (result.isSpare) {
      audio.playSpareChime();
      audio.playCrowdCheer(0.8);
      effects.playSpareCelebration(new Vector3(0, 0.5, LANE.HEADPIN_Z));
      hud.showMessage('SPARE!', '/', 2000);
      achievements.recordSpare();
    } else if (pinsDown === 0) {
      audio.playGutterSad();
      audio.playCrowdGroan();
      hud.showMessage('GUTTER', '', 1500);
      achievements.recordGutter();
    } else {
      achievements.recordOpen();
      // Near miss — crowd reaction for 8-9 pins
      if (pinsDown >= 8) {
        audio.playCrowdOoh();
      }
    }

    if (pinsDown > 0) {
      audio.playPinScatter(pinsDown);
      effects.playPinHitEffect(new Vector3(0, 0.3, LANE.HEADPIN_Z), pinsDown / 10);
    }
  });

  // Update HUD
  hud.updateScorecard(gameManager.frames, gameManager.currentFrame);
  hud.updateTotal(gameManager.totalScore);

  // Check for replay on strike/spare
  if (qualifiesForReplay && (result.isStrike || result.isSpare)) {
    // Play replay before transitioning
    replayPlaying = true;
    ui.showReplayControls();
    replay.startPlayback(
      (_pos, _lookAt) => {
        // Camera updates handled by replay system — in non-XR we could move camera
      },
      () => {
        // Replay done
        replayPlaying = false;
        ui.hideReplayControls();
        proceedAfterRoll(result);
      },
    );
    return; // Don't proceed until replay is done
  }

  proceedAfterRoll(result);
}

function proceedAfterRoll(result: { pinsDown: number; isStrike: boolean; isSpare: boolean; frameComplete: boolean; gameOver: boolean }) {
  if (result.gameOver) {
    if (multiplayerActive) {
      // In multiplayer, check if all players are done
      handleMultiplayerTurnEnd();
    } else {
      gameManager.setState(GameState.SCORE_DISPLAY);
      scoreDisplayTimer = 3;
    }
  } else if (result.frameComplete) {
    if (multiplayerActive) {
      // Switch to next player
      handleMultiplayerTurnEnd();
    } else {
      gameManager.setState(GameState.FRAME_TRANSITION);
      frameTransitionTimer = 1.5;
    }
  } else {
    // Same frame, second roll
    gameManager.setState(GameState.FRAME_TRANSITION);
    frameTransitionTimer = 1.0;
  }
}

// ── Helper: handle multiplayer turn end ────────────────────────
function handleMultiplayerTurnEnd() {
  const currentGM = multiplayer.getCurrentGameManager();
  if (!currentGM) return;

  const { nextPlayer, allDone } = multiplayer.advanceTurn();

  // Update scoreboard
  ui.showMultiplayerScoreboard(multiplayer.getScoreboard());

  if (allDone) {
    // All players finished
    const rankings = multiplayer.getRankings();
    const rankingData = rankings.map(p => ({
      name: p.config.name,
      color: '#' + p.config.color.getHexString(),
      score: p.totalScore,
      strikes: p.stats.strikes,
      spares: p.stats.spares,
    }));

    // Record ball unlock progress for each player
    for (const p of multiplayer.players) {
      ballUnlocks.recordGameComplete(p.totalScore, p.stats.strikes, p.stats.spares, p.stats.maxStreak);
    }

    audio.stopAmbientMusic();
    audio.stopRollingSound();
    hud.hide();
    ui.showMultiplayerGameOver(rankingData);
    multiplayerActive = false;
    gameManager.setState(GameState.GAME_OVER);
    return;
  }

  if (nextPlayer) {
    // Switch to next player
    gameManager = nextPlayer.gameManager;

    // Show turn banner
    ui.showTurnBanner(
      nextPlayer.config.name,
      '#' + nextPlayer.config.color.getHexString(),
      gameManager.currentFrame + 1,
    );

    // Update ball for this player
    ball.setBallType(nextPlayer.config.ballType);

    // Roll cosmic event if cosmic mode is active and it's a new frame
    if (cosmicActive && cosmic.active) {
      const event = cosmic.rollEvent();
      ui.showCosmicEventBanner(event);
    }

    // Prepare for roll after brief delay
    setTimeout(() => {
      pinManager.resetPins();
      prepareForRoll();
    }, 2200);
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

  // Save detailed statistics
  statistics.recordGame({
    date: new Date().toISOString(),
    score,
    strikes: stats.strikes,
    spares: stats.spares,
    gutters: stats.gutters,
    totalPins: stats.totalPins,
    maxStreak: stats.maxStreak,
    ballType: gameManager.ballType,
    theme: currentTheme,
    perfectGame: stats.perfectGame,
    frames: gameManager.frames.map(f => [...f.rolls]),
  });

  // Check achievements
  achievements.recordGameComplete(score, stats);
  achievements.recordBallUsed(gameManager.ballType);
  achievements.recordThemePlayed(currentTheme);

  // Ball unlock progress
  ballUnlocks.recordGameComplete(score, stats.strikes, stats.spares, stats.maxStreak);
  if (cosmicActive) {
    ballUnlocks.recordCosmicGamePlayed();
    cosmic.stop();
    cosmicActive = false;
  }

  // Show game over screen
  hud.hide();
  laneEffects.deactivateSpeedStrips();
  audio.stopAmbientMusic();
  audio.stopRollingSound();
  ui.showGameOver(score, stats);
  gameManager.setState(GameState.GAME_OVER);
}

// ── Helper: start a new game ───────────────────────────────────
function startGame() {
  // Show tutorial for first-time players
  if (!tutorial.hasCompleted() && !tutorialShownThisSession) {
    tutorialShownThisSession = true;
    tutorial.start(isXRSession, () => {
      // Tutorial complete — proceed with game start
      actualStartGame();
    });
    return;
  }
  actualStartGame();
}

function actualStartGame() {
  practiceActive = false;
  practiceManager.stop();
  gameManager.reset();
  pinManager.resetPins();
  ball.resetToReturn();

  ui.hideAll();
  hud.show();

  audio.init().then(() => {
    audio.startAmbientMusic();
    audio.playLaneHum();
  });

  prepareForRoll();
}

// Practice mode start
function startPractice(preset: PinPreset) {
  practiceActive = true;
  practiceManager.start(preset);
  gameManager.reset();
  pinManager.resetPins();
  ball.resetToReturn();

  ui.hideAll();
  hud.show();

  audio.init().then(() => {
    audio.startAmbientMusic();
    audio.playLaneHum();
  });

  // Apply pin preset if not full
  if (preset !== 'full') {
    const pinSetup = practiceManager.getPinSetup();
    for (let i = 0; i < 10; i++) {
      if (!pinSetup[i]) {
        pinManager.pins[i].standing = false;
        pinManager.pins[i].mesh.visible = false;
      }
      gameManager.pinsStanding[i] = pinSetup[i];
    }
  }

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
  laneEffects.deactivateSpeedStrips();
  practiceActive = false;
  practiceManager.stop();
  multiplayerActive = false;
  multiplayer.stop();
  cosmicActive = false;
  cosmic.stop();
  ui.hideMultiplayerScoreboard();
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
ui.onShowStatistics = () => {
  ui.showStatistics(statistics.overall, statistics.getRecentGames(5), statistics.getImprovementTrend());
};
ui.onStartPractice = (preset: string) => {
  startPractice(preset as PinPreset);
};
ui.onShowTutorial = () => {
  tutorial.start(isXRSession, () => {
    ui.showTitleScreen();
  });
};

// ── Wire up Multiplayer ────────────────────────────────────────
ui.onStartMultiplayer = (playerCount: number, names: string[]) => {
  multiplayerActive = true;
  multiplayer.start(playerCount, names);

  const firstPlayer = multiplayer.getCurrentPlayer()!;
  gameManager = firstPlayer.gameManager;
  ball.setBallType(firstPlayer.config.ballType);

  ui.hideAll();
  hud.show();
  ui.showMultiplayerScoreboard(multiplayer.getScoreboard());

  // Show first player banner
  ui.showTurnBanner(
    firstPlayer.config.name,
    '#' + firstPlayer.config.color.getHexString(),
    1,
  );

  audio.init().then(() => {
    audio.startAmbientMusic();
    audio.playLaneHum();
  });

  pinManager.resetPins();
  setTimeout(() => prepareForRoll(), 2200);
};

// ── Wire up Cosmic Bowling ─────────────────────────────────────
ui.onStartCosmicBowling = () => {
  cosmicActive = true;
  cosmic.start();

  // Roll first event
  const event = cosmic.rollEvent();
  ui.showCosmicEventBanner(event);

  // Start normal game flow
  startGame();
};

cosmic.onEventBanner((event) => {
  ui.showCosmicEventBanner(event);
});

// ── Wire up Replay ─────────────────────────────────────────────
ui.onSkipReplay = () => {
  replay.skipPlayback();
};

// ── Wire up Ball Unlocks ───────────────────────────────────────
ballUnlocks.onUnlock((ballType, _condition) => {
  const ball = BALL_TYPES[ballType];
  if (ball) {
    ui.showBallUnlockPopup(ball.name, '#' + ball.color.getHexString());
    effects.playAchievementEffect();
    audio.init().then(() => audio.playAchievementUnlock());
  }
});

// Update showUnlocks to pass data
ui.onShowUnlocks = () => {
  ui.showBallUnlocks(ballUnlocks.getUnlockInfo());
};

// ── Wire up challenges ─────────────────────────────────────────
ui.onStartChallenge = (type: ChallengeType) => {
  challengeManager.startChallenge(type);
  challengeActive = true;
  startGame(); // Reuse normal game start flow
};

challengeManager.onChallengeComplete = (success, stats) => {
  challengeActive = false;
  hud.hide();
  audio.stopAmbientMusic();
  audio.stopRollingSound();
  if (success) {
    ballUnlocks.recordChallengeComplete();
  }
  ui.showChallengeResult(success, challengeManager.currentChallenge?.name || '', stats);
  gameManager.setState(GameState.GAME_OVER);
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
    tutorial.notifyAction('grab');
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
      aimIndicator.show();
      tutorial.notifyAction('startCharge');
    }
  };

  browserInput.onPowerChange = (power: number) => {
    hud.setPower(power);
    aimIndicator.update(browserInput.getAimX(), power);
    laneEffects.highlightArrows(browserInput.getAimX(), power);
  };

  browserInput.onAimChange = (aimX: number) => {
    aimIndicator.update(aimX, browserInput.getPower());
    laneEffects.highlightArrows(aimX, browserInput.getPower());
  };

  browserInput.onThrow = (velocity: Vector3) => {
    if (gameManager.state === GameState.THROWING || gameManager.state === GameState.AIMING) {
      aimIndicator.hide();
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

// ── Wire up volume controls ────────────────────────────────────
(window as any).__onMusicVolChange = (v: number) => {
  musicVolume = v;
  audio.setMusicVolume(v);
};
(window as any).__onSfxVolChange = (v: number) => {
  sfxVolume = v;
  audio.setSFXVolume(v);
};

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

    // Apply cosmic physics effects
    if (cosmicActive && cosmic.active) {
      cosmic.applyFramePhysics(ball.position, ball.velocity, dt);

      // Bumper bounce check
      const halfLane = LANE.LANE_WIDTH / 2;
      if (cosmic.checkBumperBounce(ball.position.x, halfLane)) {
        ball.velocity.x *= -0.7;
        ball.position.x = Math.sign(ball.position.x) * (halfLane - 0.01);
        ball.inGutter = false;
        ball.state = BallState.ROLLING;
      }
    }

    // Record replay frame
    replay.recordFrame(ball.position, ball.velocity, pinsKnockedThisRoll, ball.inGutter);

    // Update rolling sound based on speed
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.z ** 2);
    audio.updateRollingSound(speed);

    // Gutter event (detect transition into gutter)
    if (ballResult.inGutter && !gutterEventFired) {
      gutterEventFired = true;
      audio.init().then(() => {
        audio.playGutterThud();
      });
      effects.playGutterEffect(ball.position.clone());
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
        // Roll cosmic event for new frame (non-multiplayer)
        if (cosmicActive && cosmic.active && !multiplayerActive) {
          const event = cosmic.rollEvent();
          ui.showCosmicEventBanner(event);
        }

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
  laneEffects.update(time, dt);
  neighbors.update(time, dt);
  cosmic.update(time, dt);

  // Update replay if playing
  if (replayPlaying) {
    replay.update(dt);
  }

  // Pin physics always need updating for falling animation
  if (state !== GameState.PIN_SETTLING) {
    pinManager.updatePhysics(dt);
  }
}

// Start the loop
gameLoop();
