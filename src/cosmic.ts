/**
 * Astro Bowl VR — Cosmic Bowling Mode
 * Random per-frame lane modifiers that shake up gameplay.
 * Events: bumpers, lane narrowing, pin shuffle, speed zones,
 * blackout mode, gravity flip, mirror lane, bonus pins, turbulence.
 */
import { Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial,
  MeshBasicMaterial, Color, Vector3, AdditiveBlending } from '@iwsdk/core';

export interface CosmicEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Apply modifier to the frame */
  apply: (ctx: CosmicContext) => void;
  /** Remove modifier after frame */
  remove: (ctx: CosmicContext) => void;
}

export interface CosmicContext {
  laneWidthMultiplier: number;
  speedMultiplier: number;
  hookMultiplier: number;
  gravityMultiplier: number;
  pinShuffled: boolean;
  bumpersActive: boolean;
  blackout: boolean;
  mirrorControls: boolean;
  bonusPins: number;
  turbulenceStrength: number;
  windX: number;
}

function defaultContext(): CosmicContext {
  return {
    laneWidthMultiplier: 1.0,
    speedMultiplier: 1.0,
    hookMultiplier: 1.0,
    gravityMultiplier: 1.0,
    pinShuffled: false,
    bumpersActive: false,
    blackout: false,
    mirrorControls: false,
    bonusPins: 0,
    turbulenceStrength: 0,
    windX: 0,
  };
}

const COSMIC_EVENTS: CosmicEvent[] = [
  {
    id: 'bumpers',
    name: 'Bumper Lane',
    description: 'Gutter guards activated — no gutters!',
    icon: '🛡️',
    apply: (ctx) => { ctx.bumpersActive = true; },
    remove: (ctx) => { ctx.bumpersActive = false; },
  },
  {
    id: 'narrow_lane',
    name: 'Narrow Passage',
    description: 'Lane width reduced by 30%!',
    icon: '↔️',
    apply: (ctx) => { ctx.laneWidthMultiplier = 0.7; },
    remove: (ctx) => { ctx.laneWidthMultiplier = 1.0; },
  },
  {
    id: 'wide_lane',
    name: 'Wide Open',
    description: 'Lane width increased by 40%!',
    icon: '🌊',
    apply: (ctx) => { ctx.laneWidthMultiplier = 1.4; },
    remove: (ctx) => { ctx.laneWidthMultiplier = 1.0; },
  },
  {
    id: 'speed_boost',
    name: 'Turbo Mode',
    description: 'Ball speed doubled!',
    icon: '⚡',
    apply: (ctx) => { ctx.speedMultiplier = 2.0; },
    remove: (ctx) => { ctx.speedMultiplier = 1.0; },
  },
  {
    id: 'slow_roll',
    name: 'Slow Roll',
    description: 'Ball moves at half speed — precision matters!',
    icon: '🐌',
    apply: (ctx) => { ctx.speedMultiplier = 0.5; },
    remove: (ctx) => { ctx.speedMultiplier = 1.0; },
  },
  {
    id: 'mega_hook',
    name: 'Mega Hook',
    description: 'All balls hook 3× harder!',
    icon: '🌀',
    apply: (ctx) => { ctx.hookMultiplier = 3.0; },
    remove: (ctx) => { ctx.hookMultiplier = 1.0; },
  },
  {
    id: 'pin_shuffle',
    name: 'Pin Shuffle',
    description: 'Pins rearranged randomly!',
    icon: '🔀',
    apply: (ctx) => { ctx.pinShuffled = true; },
    remove: (ctx) => { ctx.pinShuffled = false; },
  },
  {
    id: 'blackout',
    name: 'Blackout Bowl',
    description: 'Lights off — only glowing pins and ball visible!',
    icon: '🌑',
    apply: (ctx) => { ctx.blackout = true; },
    remove: (ctx) => { ctx.blackout = false; },
  },
  {
    id: 'crosswind',
    name: 'Crosswind',
    description: 'Strong side wind pushes the ball!',
    icon: '💨',
    apply: (ctx) => {
      ctx.windX = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 1.5);
    },
    remove: (ctx) => { ctx.windX = 0; },
  },
  {
    id: 'turbulence',
    name: 'Turbulence',
    description: 'Lane vibrates — ball path is unpredictable!',
    icon: '🌪️',
    apply: (ctx) => { ctx.turbulenceStrength = 0.8; },
    remove: (ctx) => { ctx.turbulenceStrength = 0; },
  },
  {
    id: 'low_gravity',
    name: 'Low Gravity',
    description: 'Pins float and tumble further!',
    icon: '🪐',
    apply: (ctx) => { ctx.gravityMultiplier = 0.3; },
    remove: (ctx) => { ctx.gravityMultiplier = 1.0; },
  },
  {
    id: 'mirror',
    name: 'Mirror Lane',
    description: 'Left/right controls are reversed!',
    icon: '🪞',
    apply: (ctx) => { ctx.mirrorControls = true; },
    remove: (ctx) => { ctx.mirrorControls = false; },
  },
];

export class CosmicBowlingManager {
  group: Group;
  active: boolean = false;
  context: CosmicContext = defaultContext();
  currentEvent: CosmicEvent | null = null;
  eventHistory: string[] = [];
  private bumperMeshes: Mesh[] = [];
  private eventBannerCallback: ((event: CosmicEvent) => void) | null = null;

  constructor() {
    this.group = new Group();
    this.createBumperMeshes();
  }

  start() {
    this.active = true;
    this.context = defaultContext();
    this.currentEvent = null;
    this.eventHistory = [];
  }

  stop() {
    if (this.currentEvent) {
      this.currentEvent.remove(this.context);
    }
    this.active = false;
    this.currentEvent = null;
    this.context = defaultContext();
    this.hideBumpers();
  }

  /**
   * Roll a new cosmic event for the current frame.
   * Removes the previous event first.
   */
  rollEvent(): CosmicEvent {
    // Remove previous event
    if (this.currentEvent) {
      this.currentEvent.remove(this.context);
    }

    // Pick a random event, avoiding repeats of the last 2
    let event: CosmicEvent;
    let attempts = 0;
    do {
      event = COSMIC_EVENTS[Math.floor(Math.random() * COSMIC_EVENTS.length)];
      attempts++;
    } while (
      this.eventHistory.slice(-2).includes(event.id) && attempts < 20
    );

    this.currentEvent = event;
    this.eventHistory.push(event.id);
    event.apply(this.context);

    // Show/hide bumpers
    if (this.context.bumpersActive) {
      this.showBumpers();
    } else {
      this.hideBumpers();
    }

    // Notify
    if (this.eventBannerCallback) {
      this.eventBannerCallback(event);
    }

    return event;
  }

  onEventBanner(cb: (event: CosmicEvent) => void) {
    this.eventBannerCallback = cb;
  }

  /**
   * Apply cosmic modifiers to ball velocity before throw.
   */
  modifyThrowVelocity(velocity: Vector3): Vector3 {
    const v = velocity.clone();

    // Speed modifier
    v.multiplyScalar(this.context.speedMultiplier);

    // Mirror controls
    if (this.context.mirrorControls) {
      v.x *= -1;
    }

    return v;
  }

  /**
   * Apply per-frame physics modifiers (wind, turbulence).
   */
  applyFramePhysics(position: Vector3, velocity: Vector3, dt: number) {
    // Wind
    if (this.context.windX !== 0) {
      velocity.x += this.context.windX * dt;
    }

    // Turbulence
    if (this.context.turbulenceStrength > 0) {
      velocity.x += (Math.random() - 0.5) * this.context.turbulenceStrength * dt * 2;
    }
  }

  /**
   * Get random pin positions for pin shuffle.
   * Returns an array of 10 booleans (true = standing) with shuffled positions.
   */
  getShuffledPinPositions(): Vector3[] {
    // Standard pin positions, shuffled
    const standardPositions = [
      new Vector3(0, 0, 0),           // 1 (headpin)
      new Vector3(-0.15, 0, -0.26),   // 2
      new Vector3(0.15, 0, -0.26),    // 3
      new Vector3(-0.30, 0, -0.52),   // 4
      new Vector3(0, 0, -0.52),       // 5
      new Vector3(0.30, 0, -0.52),    // 6
      new Vector3(-0.45, 0, -0.78),   // 7
      new Vector3(-0.15, 0, -0.78),   // 8
      new Vector3(0.15, 0, -0.78),    // 9
      new Vector3(0.45, 0, -0.78),    // 10
    ];

    // Fisher-Yates shuffle
    const shuffled = [...standardPositions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Check if ball should bounce off bumpers instead of entering gutter.
   */
  checkBumperBounce(ballX: number, laneHalfWidth: number): boolean {
    return this.context.bumpersActive && Math.abs(ballX) >= laneHalfWidth;
  }

  private createBumperMeshes() {
    const bumperMat = new MeshStandardMaterial({
      color: new Color(0xff4400),
      emissive: new Color(0x441100),
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3,
    });

    // Left bumper
    const leftBumper = new Mesh(
      new BoxGeometry(0.08, 0.15, 18),
      bumperMat,
    );
    leftBumper.position.set(-0.535, 0.05, -9);
    leftBumper.visible = false;
    this.group.add(leftBumper);
    this.bumperMeshes.push(leftBumper);

    // Right bumper
    const rightBumper = new Mesh(
      new BoxGeometry(0.08, 0.15, 18),
      bumperMat.clone(),
    );
    rightBumper.position.set(0.535, 0.05, -9);
    rightBumper.visible = false;
    this.group.add(rightBumper);
    this.bumperMeshes.push(rightBumper);

    // Glowing top strips
    const glowMat = new MeshBasicMaterial({
      color: new Color(0xff6600),
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });

    for (const bumper of this.bumperMeshes) {
      const glow = new Mesh(
        new BoxGeometry(0.12, 0.02, 18),
        glowMat.clone(),
      );
      glow.position.copy(bumper.position);
      glow.position.y = 0.13;
      glow.visible = false;
      this.group.add(glow);
      this.bumperMeshes.push(glow);
    }
  }

  showBumpers() {
    this.bumperMeshes.forEach(m => m.visible = true);
  }

  hideBumpers() {
    this.bumperMeshes.forEach(m => m.visible = false);
  }

  update(time: number, dt: number) {
    if (!this.active) return;

    // Animate bumpers with pulsing glow
    if (this.context.bumpersActive) {
      const pulse = 0.4 + Math.sin(time * 3) * 0.2;
      this.bumperMeshes.forEach(m => {
        if (m.material instanceof MeshBasicMaterial) {
          m.material.opacity = pulse;
        }
      });
    }
  }
}
