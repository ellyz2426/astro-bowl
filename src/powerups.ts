/**
 * Astro Bowl VR — Power-Up System
 * Earned through good bowling (strikes, spares, streaks).
 * Activatable on the next roll for strategic advantage.
 */
import {
  Group, Mesh, SphereGeometry, BoxGeometry, CylinderGeometry,
  TorusGeometry, OctahedronGeometry,
  MeshBasicMaterial, MeshStandardMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Vector3,
  AdditiveBlending,
} from '@iwsdk/core';

// ── Power-Up Definitions ───────────────────────────────────────

export type PowerUpType =
  | 'guided_ball'      // Ball auto-corrects toward pocket
  | 'explosive_pins'   // Pins explode outward on impact (bigger chain)
  | 'gutter_shield'    // Invisible gutter walls for one roll
  | 'double_score'     // Double pins counted for scoring
  | 'mega_curve'       // Extreme hook ability for one throw
  | 'pin_magnet'       // All pins pulled slightly toward ball impact
  | 'split_buster'     // Second roll auto-targets remaining pins
  | 'time_freeze';     // Extended slow-motion for dramatic effect

export interface PowerUpDef {
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
  color: Color;
  rarity: 'common' | 'rare' | 'epic';
  duration: 'one_roll' | 'one_frame' | 'instant';
}

export const POWER_UPS: Record<PowerUpType, PowerUpDef> = {
  guided_ball: {
    type: 'guided_ball',
    name: 'Guided Ball',
    description: 'Ball auto-corrects toward the pocket',
    icon: '🎯',
    color: new Color(0x00ff88),
    rarity: 'common',
    duration: 'one_roll',
  },
  explosive_pins: {
    type: 'explosive_pins',
    name: 'Explosive Pins',
    description: 'Pins scatter with triple force',
    icon: '💥',
    color: new Color(0xff4400),
    rarity: 'common',
    duration: 'one_roll',
  },
  gutter_shield: {
    type: 'gutter_shield',
    name: 'Gutter Shield',
    description: 'Invisible walls prevent gutter balls',
    icon: '🛡️',
    color: new Color(0x4488ff),
    rarity: 'common',
    duration: 'one_roll',
  },
  double_score: {
    type: 'double_score',
    name: 'Double Score',
    description: 'Pins knocked down count double',
    icon: '✨',
    color: new Color(0xffd700),
    rarity: 'rare',
    duration: 'one_roll',
  },
  mega_curve: {
    type: 'mega_curve',
    name: 'Mega Curve',
    description: 'Extreme hook for devastating angles',
    icon: '🌀',
    color: new Color(0xaa00ff),
    rarity: 'rare',
    duration: 'one_roll',
  },
  pin_magnet: {
    type: 'pin_magnet',
    name: 'Pin Magnet',
    description: 'Pins are pulled toward the impact point',
    icon: '🧲',
    color: new Color(0xff0088),
    rarity: 'rare',
    duration: 'one_roll',
  },
  split_buster: {
    type: 'split_buster',
    name: 'Split Buster',
    description: 'Second roll auto-targets remaining pins',
    icon: '⚡',
    color: new Color(0x00ffff),
    rarity: 'epic',
    duration: 'one_frame',
  },
  time_freeze: {
    type: 'time_freeze',
    name: 'Time Freeze',
    description: 'Extended slow-motion for cinematic throws',
    icon: '⏳',
    color: new Color(0x88ccff),
    rarity: 'epic',
    duration: 'instant',
  },
};

// Drop table by trigger event
const DROP_TABLE: Record<string, { type: PowerUpType; chance: number }[]> = {
  strike: [
    { type: 'guided_ball', chance: 0.25 },
    { type: 'explosive_pins', chance: 0.20 },
    { type: 'gutter_shield', chance: 0.15 },
    { type: 'double_score', chance: 0.10 },
    { type: 'mega_curve', chance: 0.08 },
    { type: 'pin_magnet', chance: 0.08 },
  ],
  spare: [
    { type: 'guided_ball', chance: 0.20 },
    { type: 'gutter_shield', chance: 0.20 },
    { type: 'explosive_pins', chance: 0.10 },
  ],
  turkey: [
    { type: 'double_score', chance: 0.30 },
    { type: 'split_buster', chance: 0.20 },
    { type: 'time_freeze', chance: 0.15 },
    { type: 'pin_magnet', chance: 0.15 },
    { type: 'mega_curve', chance: 0.10 },
  ],
  streak_5: [
    { type: 'time_freeze', chance: 0.35 },
    { type: 'split_buster', chance: 0.25 },
    { type: 'double_score', chance: 0.20 },
  ],
};

// ── Power-Up Pickup Visual ─────────────────────────────────────

class PowerUpPickup {
  group: Group;
  def: PowerUpDef;
  private floatOffset: number;
  private collected: boolean = false;
  private fadeTimer: number = 0;
  private coreMesh: Mesh;

  constructor(def: PowerUpDef, position: Vector3) {
    this.def = def;
    this.floatOffset = Math.random() * Math.PI * 2;
    this.group = new Group();
    this.group.position.copy(position);
    this.group.position.y = 0.3;

    // Core shape based on rarity
    let coreGeo;
    switch (def.rarity) {
      case 'epic':
        coreGeo = new OctahedronGeometry(0.06);
        break;
      case 'rare':
        coreGeo = new BoxGeometry(0.08, 0.08, 0.08);
        break;
      default:
        coreGeo = new SphereGeometry(0.05, 12, 12);
    }

    const coreMat = new MeshStandardMaterial({
      color: def.color,
      emissive: def.color.clone().multiplyScalar(0.3),
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.coreMesh = new Mesh(coreGeo, coreMat);
    this.group.add(this.coreMesh);

    // Wireframe
    const wireMat = new LineBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.4,
    });
    const wire = new LineSegments(new EdgesGeometry(coreGeo), wireMat);
    this.group.add(wire);

    // Outer glow
    const glowMat = new MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(new SphereGeometry(0.1, 8, 8), glowMat);
    this.group.add(glow);

    // Ring orbit
    const ringMat = new LineBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.3,
    });
    const ring = new LineSegments(
      new EdgesGeometry(new TorusGeometry(0.08, 0.003, 6, 16)),
      ringMat,
    );
    this.group.add(ring);
  }

  update(time: number, dt: number): boolean {
    if (this.collected) {
      this.fadeTimer += dt;
      const alpha = 1 - this.fadeTimer / 0.5;
      if (alpha <= 0) return true; // Remove
      this.group.scale.setScalar(1 + this.fadeTimer * 3);
      this.group.traverse(child => {
        if (child instanceof Mesh) {
          (child.material as any).opacity = alpha * 0.5;
        }
      });
      return false;
    }

    // Float and rotate
    this.group.position.y = 0.3 + Math.sin(time * 2 + this.floatOffset) * 0.05;
    this.coreMesh.rotation.y += dt * 2;
    this.coreMesh.rotation.x += dt * 0.5;

    return false;
  }

  collect() {
    this.collected = true;
    this.fadeTimer = 0;
  }

  isCollected(): boolean {
    return this.collected;
  }
}

// ── Power-Up Manager ───────────────────────────────────────────

export class PowerUpManager {
  group: Group;
  private inventory: PowerUpType[] = [];
  private activePowerUp: PowerUpType | null = null;
  private pickups: PowerUpPickup[] = [];
  private maxInventory: number = 3;

  // Callbacks
  onPowerUpCollected: (def: PowerUpDef) => void = () => {};
  onPowerUpActivated: (def: PowerUpDef) => void = () => {};
  onPowerUpExpired: (def: PowerUpDef) => void = () => {};

  constructor() {
    this.group = new Group();
  }

  /**
   * Roll for a power-up drop based on the trigger event.
   */
  rollDrop(trigger: 'strike' | 'spare' | 'turkey' | 'streak_5', dropPosition: Vector3) {
    if (this.inventory.length >= this.maxInventory) return;

    const table = DROP_TABLE[trigger];
    if (!table) return;

    for (const entry of table) {
      if (Math.random() < entry.chance) {
        this.spawnPickup(entry.type, dropPosition);
        return; // Only one drop per event
      }
    }
  }

  /**
   * Spawn a collectible power-up on the lane.
   */
  private spawnPickup(type: PowerUpType, position: Vector3) {
    const def = POWER_UPS[type];
    if (!def) return;

    const pickup = new PowerUpPickup(def, position);
    this.pickups.push(pickup);
    this.group.add(pickup.group);

    // Auto-collect after spawn animation (in VR, player would grab it)
    setTimeout(() => {
      if (!pickup.isCollected()) {
        this.collectPickup(pickup);
      }
    }, 2000);
  }

  private collectPickup(pickup: PowerUpPickup) {
    pickup.collect();
    this.inventory.push(pickup.def.type);
    this.onPowerUpCollected(pickup.def);
  }

  /**
   * Activate the next power-up in inventory for the current roll.
   */
  activateNext(): PowerUpType | null {
    if (this.inventory.length === 0) return null;
    const type = this.inventory.shift()!;
    this.activePowerUp = type;
    this.onPowerUpActivated(POWER_UPS[type]);
    return type;
  }

  /**
   * Activate a specific power-up by type.
   */
  activate(type: PowerUpType): boolean {
    const idx = this.inventory.indexOf(type);
    if (idx === -1) return false;
    this.inventory.splice(idx, 1);
    this.activePowerUp = type;
    this.onPowerUpActivated(POWER_UPS[type]);
    return true;
  }

  /**
   * Check if a power-up is currently active.
   */
  getActive(): PowerUpType | null {
    return this.activePowerUp;
  }

  /**
   * Deactivate the current power-up (after roll completes).
   */
  deactivate() {
    if (this.activePowerUp) {
      this.onPowerUpExpired(POWER_UPS[this.activePowerUp]);
      this.activePowerUp = null;
    }
  }

  /**
   * Get current inventory for UI display.
   */
  getInventory(): PowerUpDef[] {
    return this.inventory.map(t => POWER_UPS[t]);
  }

  /**
   * Apply power-up effects to ball velocity (for guided_ball, mega_curve).
   */
  modifyBallVelocity(velocity: Vector3, targetX: number): Vector3 {
    if (!this.activePowerUp) return velocity;

    switch (this.activePowerUp) {
      case 'guided_ball': {
        // Auto-correct X toward pocket
        const correction = (targetX - velocity.x) * 0.5;
        velocity.x += correction;
        break;
      }
      case 'mega_curve': {
        // Double hook effect
        velocity.x *= 1.5;
        break;
      }
    }
    return velocity;
  }

  /**
   * Check if gutter shield is active (prevents gutter).
   */
  hasGutterShield(): boolean {
    return this.activePowerUp === 'gutter_shield';
  }

  /**
   * Get pin scatter multiplier (explosive pins = 3x).
   */
  getPinScatterMultiplier(): number {
    return this.activePowerUp === 'explosive_pins' ? 3.0 : 1.0;
  }

  /**
   * Get score multiplier (double_score = 2x).
   */
  getScoreMultiplier(): number {
    return this.activePowerUp === 'double_score' ? 2.0 : 1.0;
  }

  /**
   * Check if pin magnet effect is active.
   */
  hasPinMagnet(): boolean {
    return this.activePowerUp === 'pin_magnet';
  }

  /**
   * Check if split buster is active (affects second roll targeting).
   */
  hasSplitBuster(): boolean {
    return this.activePowerUp === 'split_buster';
  }

  /**
   * Check if time freeze should trigger.
   */
  hasTimeFreeze(): boolean {
    return this.activePowerUp === 'time_freeze';
  }

  /**
   * Update pickups.
   */
  update(time: number, dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const shouldRemove = this.pickups[i].update(time, dt);
      if (shouldRemove) {
        this.group.remove(this.pickups[i].group);
        this.pickups.splice(i, 1);
      }
    }
  }

  /**
   * Clear all pickups and inventory (new game).
   */
  reset() {
    for (const p of this.pickups) {
      this.group.remove(p.group);
    }
    this.pickups = [];
    this.inventory = [];
    this.activePowerUp = null;
  }
}
