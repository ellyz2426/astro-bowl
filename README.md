# Astro Bowl VR 🎳

A holodeck-themed bowling game built with [IWSDK](https://iwsdk.dev) (Immersive Web SDK 0.4.1). Play in VR or in your browser.

**[▶ Play Now](https://ellyz2426.github.io/astro-bowl/)**

## Features

- **Full 10-pin bowling** — proper scoring with strikes, spares, 10th frame bonus rules
- **5 ball types** — Standard, Heavy, Curve, Split Seeker, and Phantom (phases through front pins)
- **3 lane themes** — Neon Circuit, Starfield, Quantum Grid
- **Dual input**
  - **VR**: Grip to grab ball → swing and release trigger to throw (velocity-tracked)
  - **Browser**: Click + drag to aim → hold for power → release to throw
- **Procedural audio** — ball rolling, pin crashes, gutter thuds, strike fanfare, spare chimes, ambient synth music (all Web Audio API)
- **Visual effects** — particle explosions, camera shake, slow-motion on big hits, holographic pin respawn
- **Pin physics** — custom collision with chain reactions
- **HUD** — scorecard, frame indicator, pin map, power meter
- **18 achievements** — Perfect Game, Turkey, Split Master, Gutter Master, and more
- **Local leaderboard** — personal best scores saved in localStorage
- **Holodeck environment** — neon grid floor, floating wireframe decorations, ambient particles

## Controls

### VR (Meta Quest)
| Action | Control |
|--------|---------|
| Grab ball | Right grip (squeeze) |
| Throw | Release trigger or grip while swinging |
| Menu navigate | Either thumbstick |
| Confirm | A button |
| Back | B button |
| Pause | Left B button |

### Browser
| Action | Control |
|--------|---------|
| Aim + charge | Click and drag on canvas |
| Throw | Release mouse button |
| Move camera | WASD |
| Confirm | Enter / Space |
| Pause | Escape |
| Back | Backspace |

## Tech

- Built with **IWSDK 0.4.1** (WebXR + browser dual-runtime)
- **Three.js** scene graph via `@iwsdk/core`
- **Vite 7** build toolchain
- Custom pin physics (no Havok for gameplay — lightweight and deterministic)
- Procedural Web Audio API (zero audio file dependencies)
- TypeScript throughout

## Development

```bash
npm install
npm run dev     # starts IWSDK dev server with XR emulation
npm run build   # production build to dist/
```

## License

MIT
