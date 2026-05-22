# 🎳 Astro Bowl VR

**Holodeck-style bowling in VR and browser** — built with [IWSDK](https://iwsdk.dev) (Immersive Web SDK).

[▶ Play Now](https://ellyz2426.github.io/astro-bowl/) · [Source](https://github.com/ellyz2426/astro-bowl)

---

## Features

### 🎮 Game Modes
- **Standard Game** — Classic 10-frame bowling with full scoring
- **Multiplayer** — 2-4 local players, turn-based with scoreboard
- **Cosmic Bowling** — 12 random per-frame modifiers (bumpers, turbo, blackout, mirror, low gravity…)
- **Hazard Bowl** — Bowl through obstacle courses: energy barriers, gravity wells, portals, deflectors, speed pads, and phase walls. 5 preset layouts + random mode
- **Challenges** — 4 skill-based challenges (Strike Master, Spare Clinic, Speed Bowl, Split Master)
- **Practice Mode** — 7 pin presets including the infamous 7-10 split

### 🎳 Ball Types
8 unique balls, each with different physics:
| Ball | Special |
|------|---------|
| Standard | Balanced all-rounder |
| Heavy | Maximum pin devastation, lower speed |
| Curve | Natural hook for pocket shots |
| Split Seeker | Wide break for cleaning splits |
| Phantom | Phases through front pins |
| Ricochet | Bounces off gutter walls |
| Magnetar | Attracts nearby pins |
| Wormhole | Teleports past arrows |

Balls unlock via score milestones, strike counts, and challenge completions.

### ⚡ Power-Up System
Earned through strikes, spares, and streaks:
- **Guided Ball** — Auto-corrects toward the pocket
- **Explosive Pins** — 3× scatter force on impact
- **Gutter Shield** — Invisible wall prevents gutter balls
- **Double Score** — Pins count double
- **Mega Curve** — Extreme hook ability
- **Pin Magnet** — Pins pulled toward impact point
- **Split Buster** — Second roll auto-targets remaining pins
- **Time Freeze** — Extended cinematic slow-motion

### 🌌 Environments
3 holodeck themes: **Neon Circuit**, **Starfield**, **Quantum Grid**
- Animated neon grid floor and ceiling
- Floating holographic shapes and particles
- Ambient colored lighting

### 🎵 Audio
Fully procedural via Web Audio API — no audio files:
- Ball rolling with speed-responsive filtering
- Pin crash, gutter thud, sweep sound
- Strike fanfare, spare chime, turkey celebration
- Crowd reactions (cheers, groans, ooh)
- Special ball sound effects
- Ambient synth-pad music per theme

### 📊 Tracking
- **18 Achievements** with localStorage persistence
- **Local Leaderboard** — Top 10 scores
- **Statistics** — Games played, averages, trends, ball-type breakdown
- **Ball Unlock Progression** — Collection screen with progress bars

### ♿ Accessibility & Settings
- Camera shake on/off (VR comfort)
- Slow-motion toggle
- Colorblind mode (3 types)
- High contrast UI
- Large text option
- Adjustable sensitivity (throw + aim)
- Particle quality levels

---

## Controls

### VR (Quest, etc.)
| Action | Control |
|--------|---------|
| Grab ball | Squeeze grip (right controller) |
| Throw ball | Release grip or trigger |
| Menu confirm | A button |
| Back / Pause | B button |
| Navigate menus | Thumbstick |

### Browser
| Action | Control |
|--------|---------|
| Aim | Click + drag left/right |
| Charge power | Hold mouse button |
| Throw | Release mouse button |
| Move camera | WASD |
| Pause | Escape |

---

## Tech Stack

- **[IWSDK](https://iwsdk.dev) 0.4.1** — Immersive Web SDK (Three.js-based WebXR framework)
- **TypeScript** — Full type safety
- **Web Audio API** — All sound is procedurally generated
- **localStorage** — Achievements, leaderboard, settings persistence
- **GitHub Pages** — Static deployment

---

## Development

```bash
npm install
npm run dev      # Start dev server (https://localhost:8081)
npm run build    # Production build to dist/
```

Requires Node.js ≥20.19.0.

---

## Architecture

```
src/
├── index.ts          # Main entry, game loop, system wiring
├── game.ts           # Scoring engine, frame logic, state machine
├── ball.ts           # Ball physics, types, throwing mechanics
├── pins.ts           # Pin physics, chain reactions, sweep animation
├── lane.ts           # Lane geometry, arrows, gutters
├── environment.ts    # Holodeck arena, themes, ambient visuals
├── xrinput.ts        # VR controller input (grip/trigger/thumbstick)
├── browserinput.ts   # Mouse/keyboard browser input
├── audio.ts          # Procedural Web Audio (music, SFX, ambience)
├── effects.ts        # Particles, camera shake, slow-motion
├── hud.ts            # In-game HUD (scorecard, power meter, messages)
├── ui.ts             # HTML UI screens (title, settings, game over…)
├── hazards.ts        # Lane obstacle system (barriers, wells, portals)
├── powerups.ts       # Power-up drops, inventory, roll modifiers
├── settings.ts       # Persistent settings with full UI generation
├── achievements.ts   # 18 achievement definitions and tracking
├── challenges.ts     # 4 skill challenge modes
├── cosmic.ts         # Cosmic bowling mode (12 modifiers)
├── multiplayer.ts    # Local multiplayer turn management
├── replay.ts         # Cinematic multi-angle replay system
├── unlocks.ts        # Ball unlock progression
├── statistics.ts     # Game history and trend analysis
├── tutorial.ts       # Step-by-step tutorial (browser + VR)
├── practice.ts       # Practice mode with configurable presets
├── laneeffects.ts    # Speed strips, arrow glows, impact rings
├── neighbors.ts      # Ambient neighboring lanes
├── aim.ts            # Visual aim trajectory indicator
└── leaderboard.ts    # Local leaderboard persistence
```

---

## Stats

- **28 source files**
- **10,000+ lines of TypeScript**
- **8 ball types** with unique physics
- **5 game modes** + practice
- **5 hazard presets** + random
- **8 power-up types**
- **3 lane themes**
- **18 achievements**
- **12 cosmic modifiers**
- **Full VR + browser dual-runtime support**

---

*Built with IWSDK 0.4.1 — Meta's WebXR development framework.*
