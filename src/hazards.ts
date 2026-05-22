/**
 * Astro Bowl VR — Lane Hazards System
 * Interactive obstacles that create strategic ball routing challenges.
 * Hazard types: energy barriers, gravity wells, speed pads, portal gates,
 * deflector bumpers, and phase walls.
 */
import {
  Group, Mesh, BoxGeometry, SphereGeometry, CylinderGeometry,
  RingGeometry, TorusGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Vector3,
  AdditiveBlending, DoubleSide,
} from '@iwsdk/core';
import { LANE } from './lane';

// ── Hazard Types ───────────────────────────────────────────────

export type HazardType =
  | 'energy_barrier'  // Reflects ball
  | 'gravity_well'    // Pulls ball toward center
  | 'speed_pad'       // Accelerates/decelerates ball
  | 'portal_gate'     // Teleports ball to linked portal
  | 'deflector'       // Angled bumper that deflects ball
  | 'phase_wall';     // Ball passes through, but changes trajectory

export interface HazardConfig {
  type: HazardType;
  position: Vector3;
  rotation?: number;   // Y-axis rotation in radians
  strength?: number;   // Effect intensity multiplier
  linkedIndex?: number; // For portals: index of linked portal
  width?: number;       // For barriers/pads
  radius?: number;      // For gravity wells
}

export interface HazardPreset {
  name: string;
  description: string;
  hazards: HazardConfig[];
}

// ── Predefined Layouts ─────────────────────────────────────────

const HALF_LANE = LANE.LANE_WIDTH / 2;
const MID_Z = (LANE.FOUL_LINE_Z + LANE.HEADPIN_Z) / 2;

export const HAZARD_PRESETS: Record<string, HazardPreset> = {
  gauntlet: {
    name: 'The Gauntlet',
    description: 'Navigate through energy barriers',
    hazards: [
      { type: 'energy_barrier', position: new Vector3(-0.2, 0, MID_Z + 3), width: 0.3, rotation: 0.3 },
      { type: 'energy_barrier', position: new Vector3(0.25, 0, MID_Z + 1), width: 0.3, rotation: -0.2 },
      { type: 'energy_barrier', position: new Vector3(-0.15, 0, MID_Z - 1), width: 0.25, rotation: 0.15 },
      { type: 'deflector', position: new Vector3(0.3, 0, MID_Z - 2.5), rotation: Math.PI / 4 },
    ],
  },
  gravity_maze: {
    name: 'Gravity Maze',
    description: 'Gravity wells warp your ball path',
    hazards: [
      { type: 'gravity_well', position: new Vector3(-0.25, 0, MID_Z + 2), radius: 0.8, strength: 1.2 },
      { type: 'gravity_well', position: new Vector3(0.3, 0, MID_Z), radius: 0.6, strength: 0.9 },
      { type: 'gravity_well', position: new Vector3(0, 0, MID_Z - 2), radius: 1.0, strength: 1.5 },
      { type: 'speed_pad', position: new Vector3(0, 0, MID_Z + 4), width: 0.5, strength: 1.4 },
    ],
  },
  warp_zone: {
    name: 'Warp Zone',
    description: 'Portals teleport your ball',
    hazards: [
      { type: 'portal_gate', position: new Vector3(-0.3, 0, MID_Z + 2), linkedIndex: 1, rotation: 0 },
      { type: 'portal_gate', position: new Vector3(0.2, 0, MID_Z - 2), linkedIndex: 0, rotation: 0 },
      { type: 'portal_gate', position: new Vector3(0.3, 0, MID_Z + 1), linkedIndex: 3, rotation: 0 },
      { type: 'portal_gate', position: new Vector3(-0.15, 0, MID_Z - 1), linkedIndex: 2, rotation: 0 },
      { type: 'deflector', position: new Vector3(0, 0, MID_Z + 3.5), rotation: 0 },
    ],
  },
  speed_circuit: {
    name: 'Speed Circuit',
    description: 'Speed pads and phase walls change your ball',
    hazards: [
      { type: 'speed_pad', position: new Vector3(0, 0, MID_Z + 3), width: 0.6, strength: 1.5 },
      { type: 'phase_wall', position: new Vector3(0, 0, MID_Z + 1), width: 0.8, rotation: 0.1 },
      { type: 'speed_pad', position: new Vector3(-0.2, 0, MID_Z - 1), width: 0.4, strength: 0.5 },
      { type: 'phase_wall', position: new Vector3(0.15, 0, MID_Z - 2.5), width: 0.6, rotation: -0.15 },
      { type: 'deflector', position: new Vector3(-HALF_LANE + 0.15, 0, MID_Z), rotation: -Math.PI / 6 },
      { type: 'deflector', position: new Vector3(HALF_LANE - 0.15, 0, MID_Z - 1.5), rotation: Math.PI / 6 },
    ],
  },
  chaos: {
    name: 'Chaos Theory',
    description: 'Everything at once — good luck',
    hazards: [
      { type: 'gravity_well', position: new Vector3(0, 0, MID_Z + 2), radius: 0.7, strength: 1.0 },
      { type: 'energy_barrier', position: new Vector3(-0.2, 0, MID_Z + 0.5), width: 0.25, rotation: 0.4 },
      { type: 'portal_gate', position: new Vector3(0.3, 0, MID_Z - 0.5), linkedIndex: 1 },
      { type: 'portal_gate', position: new Vector3(-0.25, 0, MID_Z - 3), linkedIndex: 0 },
      { type: 'speed_pad', position: new Vector3(0, 0, MID_Z - 1.5), width: 0.5, strength: 1.6 },
      { type: 'deflector', position: new Vector3(0.15, 0, MID_Z + 3.5), rotation: Math.PI / 5 },
      { type: 'phase_wall', position: new Vector3(-0.1, 0, MID_Z - 2), width: 0.4, rotation: 0.2 },
    ],
  },
};

// ── Individual Hazard Objects ──────────────────────────────────

class HazardObject {
  group: Group;
  config: HazardConfig;
  active: boolean = true;
  cooldownTimer: number = 0;
  private animTimer: number = 0;
  private baseMeshes: Mesh[] = [];

  constructor(config: HazardConfig, themeColor: Color) {
    this.config = config;
    this.group = new Group();
    this.group.position.copy(config.position);
    this.group.position.y = LANE.SURFACE_Y + 0.01;
    if (config.rotation) this.group.rotation.y = config.rotation;

    switch (config.type) {
      case 'energy_barrier': this.buildEnergyBarrier(themeColor); break;
      case 'gravity_well': this.buildGravityWell(themeColor); break;
      case 'speed_pad': this.buildSpeedPad(themeColor); break;
      case 'portal_gate': this.buildPortalGate(themeColor); break;
      case 'deflector': this.buildDeflector(themeColor); break;
      case 'phase_wall': this.buildPhaseWall(themeColor); break;
    }
  }

  private buildEnergyBarrier(themeColor: Color) {
    const w = this.config.width ?? 0.3;
    // Vertical energy wall
    const wallMat = new MeshBasicMaterial({
      color: new Color(0xff4444),
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const wall = new Mesh(new PlaneGeometry(w, 0.3), wallMat);
    wall.position.y = 0.15;
    this.group.add(wall);
    this.baseMeshes.push(wall);

    // Edge glow
    const edgeMat = new LineBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.8 });
    const edges = new EdgesGeometry(wall.geometry);
    const edgeLines = new LineSegments(edges, edgeMat);
    edgeLines.position.copy(wall.position);
    this.group.add(edgeLines);

    // Base markers
    const baseMat = new MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 });
    const baseL = new Mesh(new CylinderGeometry(0.02, 0.02, 0.35, 8), baseMat);
    baseL.position.set(-w / 2, 0.175, 0);
    this.group.add(baseL);
    const baseR = new Mesh(new CylinderGeometry(0.02, 0.02, 0.35, 8), baseMat.clone());
    baseR.position.set(w / 2, 0.175, 0);
    this.group.add(baseR);
  }

  private buildGravityWell(themeColor: Color) {
    const r = this.config.radius ?? 0.6;
    // Concentric rings on the floor
    const ringColors = [
      new Color(0x8800ff),
      new Color(0x6600cc),
      new Color(0x440088),
    ];
    for (let i = 0; i < 3; i++) {
      const innerR = r * (i / 3);
      const outerR = r * ((i + 1) / 3);
      const ringMat = new MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.3 - i * 0.08,
        blending: AdditiveBlending,
        side: DoubleSide,
      });
      const ring = new Mesh(new RingGeometry(innerR, outerR, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.005 + i * 0.002;
      this.group.add(ring);
      this.baseMeshes.push(ring);
    }

    // Central sphere (the "well")
    const coreMat = new MeshBasicMaterial({
      color: 0xaa00ff,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });
    const core = new Mesh(new SphereGeometry(0.05, 12, 12), coreMat);
    core.position.y = 0.06;
    this.group.add(core);
    this.baseMeshes.push(core);

    // Wireframe torus for visual depth
    const torusMat = new LineBasicMaterial({
      color: 0x8800ff,
      transparent: true,
      opacity: 0.4,
    });
    const torus = new LineSegments(
      new EdgesGeometry(new TorusGeometry(r * 0.5, 0.01, 6, 16)),
      torusMat,
    );
    torus.rotation.x = -Math.PI / 2;
    torus.position.y = 0.01;
    this.group.add(torus);
  }

  private buildSpeedPad(themeColor: Color) {
    const w = this.config.width ?? 0.5;
    const isBoost = (this.config.strength ?? 1) >= 1;
    const color = isBoost ? new Color(0x00ff44) : new Color(0xff8800);

    // Floor pad
    const padMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const pad = new Mesh(new PlaneGeometry(w, 0.6), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.005;
    this.group.add(pad);
    this.baseMeshes.push(pad);

    // Chevron arrows (direction indicators)
    const arrowMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    for (let i = 0; i < 3; i++) {
      const arrow = new Mesh(new BoxGeometry(w * 0.6, 0.008, 0.02), arrowMat.clone());
      arrow.position.set(0, 0.01, -0.15 + i * 0.15);
      this.group.add(arrow);
    }

    // Edge lines
    const edgeMat = new LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const edges = new EdgesGeometry(pad.geometry);
    const edgeLines = new LineSegments(edges, edgeMat);
    edgeLines.rotation.x = -Math.PI / 2;
    edgeLines.position.y = 0.006;
    this.group.add(edgeLines);
  }

  private buildPortalGate(themeColor: Color) {
    // Floating ring
    const ringMat = new MeshStandardMaterial({
      color: 0x00aaff,
      emissive: new Color(0x0044aa),
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new Mesh(new TorusGeometry(0.12, 0.015, 12, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.13;
    this.group.add(ring);
    this.baseMeshes.push(ring);

    // Inner portal surface
    const portalMat = new MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const portalSurf = new Mesh(new SphereGeometry(0.1, 16, 16), portalMat);
    portalSurf.scale.set(1, 0.2, 1);
    portalSurf.position.y = 0.13;
    this.group.add(portalSurf);
    this.baseMeshes.push(portalSurf);

    // Base glow
    const baseMat = new MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.25,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const baseGlow = new Mesh(new RingGeometry(0.04, 0.15, 16), baseMat);
    baseGlow.rotation.x = -Math.PI / 2;
    baseGlow.position.y = 0.003;
    this.group.add(baseGlow);
  }

  private buildDeflector(themeColor: Color) {
    // Angled bumper
    const bumpMat = new MeshStandardMaterial({
      color: 0xffcc00,
      emissive: new Color(0x664400),
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.7,
    });
    const bumper = new Mesh(new BoxGeometry(0.04, 0.15, 0.2), bumpMat);
    bumper.position.y = 0.075;
    this.group.add(bumper);
    this.baseMeshes.push(bumper);

    // Wireframe
    const wireMat = new LineBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.6 });
    const edges = new EdgesGeometry(bumper.geometry);
    const wire = new LineSegments(edges, wireMat);
    wire.position.copy(bumper.position);
    this.group.add(wire);

    // Impact glow (hidden until activated)
    const glowMat = new MeshBasicMaterial({
      color: 0xffee00,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(new SphereGeometry(0.1, 8, 8), glowMat);
    glow.position.y = 0.075;
    this.group.add(glow);
  }

  private buildPhaseWall(themeColor: Color) {
    const w = this.config.width ?? 0.6;
    // Translucent shimmering wall
    const wallMat = new MeshBasicMaterial({
      color: new Color(0x00ffaa),
      transparent: true,
      opacity: 0.2,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const wall = new Mesh(new PlaneGeometry(w, 0.25), wallMat);
    wall.position.y = 0.125;
    this.group.add(wall);
    this.baseMeshes.push(wall);

    // Scan lines (horizontal stripes)
    for (let i = 0; i < 5; i++) {
      const lineMat = new MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.4,
      });
      const line = new Mesh(new BoxGeometry(w, 0.003, 0.002), lineMat);
      line.position.y = 0.04 + i * 0.05;
      this.group.add(line);
    }

    // Edge glow
    const edgeMat = new LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.5 });
    const edges = new EdgesGeometry(wall.geometry);
    const edgeLines = new LineSegments(edges, edgeMat);
    edgeLines.position.copy(wall.position);
    this.group.add(edgeLines);
  }

  update(time: number, dt: number) {
    this.animTimer += dt;
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    // Type-specific animations
    switch (this.config.type) {
      case 'energy_barrier':
        // Pulse opacity
        if (this.baseMeshes[0]) {
          (this.baseMeshes[0].material as MeshBasicMaterial).opacity =
            0.35 + Math.sin(time * 4) * 0.15;
        }
        break;

      case 'gravity_well':
        // Rotate rings slowly
        for (const m of this.baseMeshes) {
          if (m.geometry instanceof RingGeometry) {
            m.rotation.z += dt * 0.5;
          }
        }
        // Pulse core
        const core = this.baseMeshes[this.baseMeshes.length - 1];
        if (core) {
          const scale = 1 + Math.sin(time * 3) * 0.2;
          core.scale.setScalar(scale);
        }
        break;

      case 'speed_pad':
        // Animate chevron opacity
        let childIdx = 0;
        this.group.children.forEach(child => {
          if (child instanceof Mesh && child.geometry instanceof BoxGeometry) {
            const phase = (time * 3 + childIdx * 0.5) % 1;
            (child.material as MeshBasicMaterial).opacity = 0.3 + phase * 0.5;
            childIdx++;
          }
        });
        break;

      case 'portal_gate':
        // Rotate ring and pulse portal
        if (this.baseMeshes[0]) {
          this.baseMeshes[0].rotation.z += dt * 2;
        }
        if (this.baseMeshes[1]) {
          const pulse = 0.2 + Math.sin(time * 5) * 0.15;
          (this.baseMeshes[1].material as MeshBasicMaterial).opacity = pulse;
        }
        break;

      case 'deflector':
        // Subtle glow pulse
        if (this.baseMeshes[0]) {
          const mat = this.baseMeshes[0].material as MeshStandardMaterial;
          mat.emissiveIntensity = 0.2 + Math.sin(time * 2) * 0.15;
        }
        break;

      case 'phase_wall':
        // Shimmer scan lines
        if (this.baseMeshes[0]) {
          (this.baseMeshes[0].material as MeshBasicMaterial).opacity =
            0.15 + Math.sin(time * 6) * 0.1;
        }
        break;
    }
  }

  /**
   * Check if a ball at the given position is affected by this hazard.
   * Returns the modification to apply (velocity change, teleport, etc.)
   */
  checkBallInteraction(
    ballPos: Vector3,
    ballVelocity: Vector3,
    ballRadius: number,
    dt: number,
  ): { velocityDelta: Vector3; teleportTo: Vector3 | null; triggered: boolean } {
    const result = { velocityDelta: new Vector3(), teleportTo: null as Vector3 | null, triggered: false };

    if (!this.active || this.cooldownTimer > 0) return result;

    const localPos = ballPos.clone().sub(this.config.position);
    // Account for hazard rotation
    if (this.config.rotation) {
      const cos = Math.cos(-this.config.rotation);
      const sin = Math.sin(-this.config.rotation);
      const x = localPos.x * cos - localPos.z * sin;
      const z = localPos.x * sin + localPos.z * cos;
      localPos.x = x;
      localPos.z = z;
    }

    const dist2D = Math.sqrt(localPos.x ** 2 + localPos.z ** 2);

    switch (this.config.type) {
      case 'energy_barrier': {
        const w = (this.config.width ?? 0.3) / 2;
        if (Math.abs(localPos.x) < w + ballRadius && Math.abs(localPos.z) < ballRadius + 0.02) {
          // Reflect ball velocity relative to barrier normal
          const normal = new Vector3(0, 0, Math.sign(localPos.z) || 1);
          // Rotate normal by hazard rotation
          if (this.config.rotation) {
            const cos = Math.cos(this.config.rotation);
            const sin = Math.sin(this.config.rotation);
            const nx = normal.x * cos - normal.z * sin;
            const nz = normal.x * sin + normal.z * cos;
            normal.x = nx;
            normal.z = nz;
          }
          const dot = ballVelocity.dot(normal);
          result.velocityDelta.copy(normal).multiplyScalar(-2 * dot);
          // Subtract current velocity to make it a delta that creates reflection
          result.velocityDelta.sub(ballVelocity).add(ballVelocity);
          // Actually: reflection = v - 2(v·n)n, so delta = -2(v·n)n
          result.velocityDelta.set(0, 0, 0);
          result.velocityDelta.copy(normal).multiplyScalar(-2 * dot);
          result.triggered = true;
          this.cooldownTimer = 0.3;
        }
        break;
      }

      case 'gravity_well': {
        const r = this.config.radius ?? 0.6;
        if (dist2D < r) {
          const strength = (this.config.strength ?? 1.0) * 3.0;
          const pull = 1 - dist2D / r; // Stronger at center
          const dir = this.config.position.clone().sub(ballPos).normalize();
          dir.y = 0;
          result.velocityDelta.copy(dir).multiplyScalar(pull * strength * dt);
          result.triggered = true;
        }
        break;
      }

      case 'speed_pad': {
        const w = (this.config.width ?? 0.5) / 2;
        if (Math.abs(localPos.x) < w + ballRadius && Math.abs(localPos.z) < 0.3 + ballRadius) {
          const mult = this.config.strength ?? 1.0;
          // Apply acceleration in ball's current direction
          const dir = ballVelocity.clone().normalize();
          if (dir.length() > 0.01) {
            const accel = (mult - 1.0) * 5.0;
            result.velocityDelta.copy(dir).multiplyScalar(accel * dt);
            result.triggered = true;
          }
        }
        break;
      }

      case 'portal_gate': {
        if (dist2D < 0.15 + ballRadius) {
          // Teleport to linked portal position
          result.triggered = true;
          this.cooldownTimer = 0.5;
        }
        break;
      }

      case 'deflector': {
        const halfW = 0.1 + ballRadius;
        const halfD = 0.02 + ballRadius;
        if (Math.abs(localPos.x) < halfW && Math.abs(localPos.z) < halfD) {
          // Deflect: reflect off the angled surface
          // The deflector's local Z-normal, rotated to world
          const normal = new Vector3(0, 0, Math.sign(localPos.z) || 1);
          if (this.config.rotation) {
            const cos = Math.cos(this.config.rotation);
            const sin = Math.sin(this.config.rotation);
            const nx = normal.x * cos - normal.z * sin;
            const nz = normal.x * sin + normal.z * cos;
            normal.x = nx;
            normal.z = nz;
          }
          const dot = ballVelocity.dot(normal);
          if (dot < 0) { // Only deflect if ball is moving toward deflector
            result.velocityDelta.copy(normal).multiplyScalar(-2 * dot);
            result.triggered = true;
            this.cooldownTimer = 0.3;
          }
        }
        break;
      }

      case 'phase_wall': {
        const w = (this.config.width ?? 0.6) / 2;
        if (Math.abs(localPos.x) < w + ballRadius && Math.abs(localPos.z) < ballRadius + 0.02) {
          // Phase through: add random lateral deviation
          const deviation = (Math.random() - 0.5) * 2.0 * (this.config.strength ?? 1.0);
          result.velocityDelta.x += deviation;
          // Small speed boost through the wall
          const dir = ballVelocity.clone().normalize();
          result.velocityDelta.add(dir.multiplyScalar(0.5));
          result.triggered = true;
          this.cooldownTimer = 0.4;
        }
        break;
      }
    }

    return result;
  }
}

// ── Main Hazard Manager ────────────────────────────────────────

export class HazardManager {
  group: Group;
  private hazards: HazardObject[] = [];
  private activePreset: string | null = null;
  active: boolean = false;
  private themeColor: Color;

  // Callbacks
  onHazardTriggered: (type: HazardType, position: Vector3) => void = () => {};

  constructor(themeColor: Color) {
    this.group = new Group();
    this.themeColor = themeColor;
  }

  /**
   * Activate a hazard layout preset.
   */
  loadPreset(presetName: string) {
    this.clear();
    const preset = HAZARD_PRESETS[presetName];
    if (!preset) return;

    this.activePreset = presetName;
    this.active = true;

    for (const config of preset.hazards) {
      const hazard = new HazardObject(config, this.themeColor);
      this.hazards.push(hazard);
      this.group.add(hazard.group);
    }
  }

  /**
   * Load random preset.
   */
  loadRandom() {
    const keys = Object.keys(HAZARD_PRESETS);
    const pick = keys[Math.floor(Math.random() * keys.length)];
    this.loadPreset(pick);
    return pick;
  }

  /**
   * Clear all hazards.
   */
  clear() {
    for (const h of this.hazards) {
      this.group.remove(h.group);
    }
    this.hazards = [];
    this.activePreset = null;
    this.active = false;
  }

  /**
   * Process ball interaction with all active hazards.
   * Returns accumulated velocity delta and optional teleport destination.
   */
  processBallPhysics(
    ballPos: Vector3,
    ballVelocity: Vector3,
    ballRadius: number,
    dt: number,
  ): { velocityDelta: Vector3; teleportTo: Vector3 | null } {
    const accum = { velocityDelta: new Vector3(), teleportTo: null as Vector3 | null };

    if (!this.active) return accum;

    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      const result = h.checkBallInteraction(ballPos, ballVelocity, ballRadius, dt);

      if (result.triggered) {
        accum.velocityDelta.add(result.velocityDelta);
        this.onHazardTriggered(h.config.type, h.config.position);

        // Handle portal teleport specially
        if (h.config.type === 'portal_gate' && h.config.linkedIndex !== undefined) {
          const linkedHazard = this.hazards[h.config.linkedIndex];
          if (linkedHazard && linkedHazard.config.type === 'portal_gate') {
            accum.teleportTo = linkedHazard.config.position.clone();
            accum.teleportTo.y = ballPos.y;
            // Also cooldown the linked portal
            linkedHazard.cooldownTimer = 0.5;
          }
        }
      }
    }

    return accum;
  }

  update(time: number, dt: number) {
    for (const h of this.hazards) {
      h.update(time, dt);
    }
  }

  getPresetName(): string {
    if (!this.activePreset) return '';
    return HAZARD_PRESETS[this.activePreset]?.name ?? '';
  }

  getPresetDescription(): string {
    if (!this.activePreset) return '';
    return HAZARD_PRESETS[this.activePreset]?.description ?? '';
  }

  getPresetList(): { key: string; name: string; description: string }[] {
    return Object.entries(HAZARD_PRESETS).map(([key, preset]) => ({
      key,
      name: preset.name,
      description: preset.description,
    }));
  }
}
