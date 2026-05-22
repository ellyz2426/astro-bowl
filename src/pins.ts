/**
 * Astro Bowl VR — Pin System
 * 10 pins with proper triangular arrangement, physics simulation,
 * fall/scatter/topple, sweep animation, holographic respawn.
 */
import {
  Group, Mesh, CylinderGeometry, SphereGeometry, BoxGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Vector3, Quaternion,
  AdditiveBlending,
} from '@iwsdk/core';
import { LANE } from './lane';

export interface PinState {
  index: number;
  standing: boolean;
  position: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3;
  rotation: { x: number; y: number; z: number };
  settleTimer: number;
  mesh: Group;
  originalPosition: Vector3;
}

const PIN_HEIGHT = 0.38;
const PIN_RADIUS_BASE = 0.057;
const PIN_RADIUS_NECK = 0.03;
const PIN_RADIUS_HEAD = 0.045;
const PIN_MASS = 1.5; // kg
const GRAVITY = -9.81;
const FLOOR_Y = LANE.SURFACE_Y;
const SETTLE_THRESHOLD = 0.01;
const SETTLE_TIME = 0.5; // seconds to consider settled
const FRICTION = 0.7;
const RESTITUTION = 0.3;
const PIN_PIN_RESTITUTION = 0.5;

export class PinManager {
  group: Group;
  pins: PinState[] = [];
  private primaryColor: Color;
  private accentColor: Color;
  sweepInProgress: boolean = false;
  private sweepProgress: number = 0;
  private sweepBar: Mesh;
  private respawnTimer: number = 0;
  private respawnPhase: 'idle' | 'sweep' | 'clear' | 'respawn' = 'idle';
  allSettled: boolean = false;

  constructor(primaryColor: Color, accentColor: Color) {
    this.primaryColor = primaryColor;
    this.accentColor = accentColor;
    this.group = new Group();
    this.createSweepBar();
    this.resetPins();
  }

  private createPinMesh(index: number): Group {
    const pinGroup = new Group();

    // Pin body (simplified bowling pin shape using multiple cylinders)
    // Base (wide)
    const baseMat = new MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.2,
      metalness: 0.4,
      emissive: this.primaryColor,
      emissiveIntensity: 0.05,
    });
    const base = new Mesh(new CylinderGeometry(PIN_RADIUS_BASE, PIN_RADIUS_BASE * 1.1, PIN_HEIGHT * 0.35, 12), baseMat);
    base.position.y = PIN_HEIGHT * 0.175;
    pinGroup.add(base);

    // Neck (narrow)
    const neck = new Mesh(
      new CylinderGeometry(PIN_RADIUS_NECK, PIN_RADIUS_BASE, PIN_HEIGHT * 0.3, 12),
      baseMat.clone(),
    );
    neck.position.y = PIN_HEIGHT * 0.5;
    pinGroup.add(neck);

    // Head (wider top)
    const head = new Mesh(
      new CylinderGeometry(PIN_RADIUS_HEAD * 0.6, PIN_RADIUS_HEAD, PIN_HEIGHT * 0.25, 12),
      baseMat.clone(),
    );
    head.position.y = PIN_HEIGHT * 0.775;
    pinGroup.add(head);

    // Red stripe
    const stripeMat = new MeshBasicMaterial({
      color: 0xff2244,
      transparent: true,
      opacity: 0.8,
    });
    const stripe = new Mesh(new CylinderGeometry(PIN_RADIUS_NECK + 0.002, PIN_RADIUS_NECK + 0.002, 0.025, 12), stripeMat);
    stripe.position.y = PIN_HEIGHT * 0.58;
    pinGroup.add(stripe);

    const stripe2 = new Mesh(new CylinderGeometry(PIN_RADIUS_NECK + 0.002, PIN_RADIUS_NECK + 0.002, 0.025, 12), stripeMat.clone());
    stripe2.position.y = PIN_HEIGHT * 0.63;
    pinGroup.add(stripe2);

    // Wireframe overlay for holodeck aesthetic
    const wireMat = new LineBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.15,
    });
    for (const child of [base, neck, head]) {
      const edges = new EdgesGeometry(child.geometry);
      const wireframe = new LineSegments(edges, wireMat);
      wireframe.position.copy(child.position);
      pinGroup.add(wireframe);
    }

    // Number label (flat mesh on the pin)
    // Simplified — just a dot marker for identification
    const dotMat = new MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.5,
    });
    const dot = new Mesh(new SphereGeometry(0.008, 6, 6), dotMat);
    dot.position.set(0, PIN_HEIGHT * 0.65, PIN_RADIUS_NECK + 0.01);
    pinGroup.add(dot);

    return pinGroup;
  }

  private createSweepBar() {
    const barMat = new MeshStandardMaterial({
      color: 0x333366,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    this.sweepBar = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH + LANE.GUTTER_WIDTH * 2, 0.5, 0.05),
      barMat,
    );
    this.sweepBar.position.set(0, 5, LANE.HEADPIN_Z);
    this.sweepBar.visible = false;
    this.group.add(this.sweepBar);

    // Wireframe
    const edges = new EdgesGeometry(this.sweepBar.geometry);
    const edgeMat = new LineBasicMaterial({ color: this.primaryColor, transparent: true, opacity: 0.5 });
    const wire = new LineSegments(edges, edgeMat);
    this.sweepBar.add(wire);
  }

  resetPins(onlyStanding: boolean = false) {
    // Remove existing pin meshes
    if (!onlyStanding) {
      for (const pin of this.pins) {
        this.group.remove(pin.mesh);
      }
      this.pins = [];
    }

    const positions = this.getPinPositions();

    if (onlyStanding) {
      // Just reset positions of standing pins
      for (const pin of this.pins) {
        if (pin.standing) {
          pin.position.copy(pin.originalPosition);
          pin.velocity.set(0, 0, 0);
          pin.angularVelocity.set(0, 0, 0);
          pin.rotation = { x: 0, y: 0, z: 0 };
          pin.settleTimer = 0;
          pin.mesh.position.copy(pin.originalPosition);
          pin.mesh.rotation.set(0, 0, 0);
        }
      }
      return;
    }

    for (let i = 0; i < 10; i++) {
      const mesh = this.createPinMesh(i);
      const pos = new Vector3(positions[i].x, FLOOR_Y, positions[i].z);
      mesh.position.copy(pos);

      const pinState: PinState = {
        index: i,
        standing: true,
        position: pos.clone(),
        velocity: new Vector3(),
        angularVelocity: new Vector3(),
        rotation: { x: 0, y: 0, z: 0 },
        settleTimer: 0,
        mesh,
        originalPosition: pos.clone(),
      };

      this.pins.push(pinState);
      this.group.add(mesh);
    }
    this.allSettled = true;
  }

  private getPinPositions(): { x: number; z: number }[] {
    const sp = LANE.PIN_SPACING;
    const startZ = LANE.HEADPIN_Z;
    return [
      { x: 0, z: startZ },
      { x: -sp / 2, z: startZ - sp * 0.866 },
      { x: sp / 2, z: startZ - sp * 0.866 },
      { x: -sp, z: startZ - sp * 0.866 * 2 },
      { x: 0, z: startZ - sp * 0.866 * 2 },
      { x: sp, z: startZ - sp * 0.866 * 2 },
      { x: -sp * 1.5, z: startZ - sp * 0.866 * 3 },
      { x: -sp / 2, z: startZ - sp * 0.866 * 3 },
      { x: sp / 2, z: startZ - sp * 0.866 * 3 },
      { x: sp * 1.5, z: startZ - sp * 0.866 * 3 },
    ];
  }

  /**
   * Apply ball collision to pins.
   * Returns number of pins knocked down.
   */
  applyBallImpact(ballPos: Vector3, ballVelocity: Vector3, ballRadius: number, ballMass: number): number {
    let knockedDown = 0;

    for (const pin of this.pins) {
      if (!pin.standing) continue;

      const dist = new Vector3(
        pin.position.x - ballPos.x,
        0,
        pin.position.z - ballPos.z,
      ).length();

      const hitRadius = ballRadius + PIN_RADIUS_BASE;

      if (dist < hitRadius) {
        // Direct hit
        const impactDir = new Vector3(
          pin.position.x - ballPos.x,
          0,
          pin.position.z - ballPos.z,
        ).normalize();

        // Impulse based on ball velocity and mass
        const impulseMag = ballMass * ballVelocity.length() * 0.8;
        pin.velocity.x += impactDir.x * impulseMag * 0.5 + ballVelocity.x * 0.3;
        pin.velocity.z += impactDir.z * impulseMag * 0.5 + ballVelocity.z * 0.3;
        pin.velocity.y += 1.5 + Math.random() * 2;

        // Angular velocity from off-center hit
        pin.angularVelocity.x += (Math.random() - 0.5) * 8;
        pin.angularVelocity.z += impactDir.x * 5;

        pin.standing = false;
        pin.settleTimer = 0;
        knockedDown++;
      }
    }

    // Pin-to-pin chain reactions
    this.resolveChainReactions();
    return knockedDown;
  }

  private resolveChainReactions() {
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.pins.length; i++) {
        const pinA = this.pins[i];
        if (pinA.standing) continue; // Only fallen pins can knock others

        for (let j = 0; j < this.pins.length; j++) {
          if (i === j) continue;
          const pinB = this.pins[j];
          if (!pinB.standing) continue;

          const dist = new Vector3(
            pinB.position.x - pinA.position.x,
            0,
            pinB.position.z - pinA.position.z,
          ).length();

          const chainRadius = PIN_RADIUS_BASE * 3;
          if (dist < chainRadius && pinA.velocity.length() > 0.5) {
            const dir = new Vector3(
              pinB.position.x - pinA.position.x,
              0,
              pinB.position.z - pinA.position.z,
            ).normalize();

            const transferSpeed = pinA.velocity.length() * PIN_PIN_RESTITUTION;
            pinB.velocity.x += dir.x * transferSpeed;
            pinB.velocity.z += dir.z * transferSpeed;
            pinB.velocity.y += 0.8 + Math.random();
            pinB.angularVelocity.x += (Math.random() - 0.5) * 5;
            pinB.angularVelocity.z += dir.x * 3;
            pinB.standing = false;
          }
        }
      }
    }
  }

  /**
   * Update pin physics each frame.
   */
  updatePhysics(dt: number) {
    this.allSettled = true;

    for (const pin of this.pins) {
      if (pin.standing) continue;

      // Gravity
      pin.velocity.y += GRAVITY * dt;

      // Update position
      pin.position.x += pin.velocity.x * dt;
      pin.position.y += pin.velocity.y * dt;
      pin.position.z += pin.velocity.z * dt;

      // Update rotation
      pin.rotation.x += pin.angularVelocity.x * dt;
      pin.rotation.z += pin.angularVelocity.z * dt;

      // Floor collision
      if (pin.position.y < FLOOR_Y) {
        pin.position.y = FLOOR_Y;
        pin.velocity.y *= -RESTITUTION;
        if (Math.abs(pin.velocity.y) < 0.1) pin.velocity.y = 0;

        // Friction
        pin.velocity.x *= FRICTION;
        pin.velocity.z *= FRICTION;
        pin.angularVelocity.x *= FRICTION;
        pin.angularVelocity.z *= FRICTION;
      }

      // Lane boundaries
      const halfLane = LANE.LANE_WIDTH / 2 + LANE.GUTTER_WIDTH + 0.3;
      if (Math.abs(pin.position.x) > halfLane) {
        pin.position.x = Math.sign(pin.position.x) * halfLane;
        pin.velocity.x *= -0.3;
      }

      // Backstop collision
      if (pin.position.z < LANE.BACKSTOP_Z) {
        pin.position.z = LANE.BACKSTOP_Z;
        pin.velocity.z *= -0.3;
      }

      // Check if settled
      const speed = pin.velocity.length() + Math.abs(pin.angularVelocity.x) + Math.abs(pin.angularVelocity.z);
      if (speed < SETTLE_THRESHOLD) {
        pin.settleTimer += dt;
        if (pin.settleTimer > SETTLE_TIME) {
          pin.velocity.set(0, 0, 0);
          pin.angularVelocity.set(0, 0, 0);
        } else {
          this.allSettled = false;
        }
      } else {
        pin.settleTimer = 0;
        this.allSettled = false;
      }

      // Update mesh
      pin.mesh.position.copy(pin.position);
      pin.mesh.rotation.set(pin.rotation.x, 0, pin.rotation.z);
    }
  }

  /**
   * Count how many pins are currently standing.
   */
  countStanding(): number {
    return this.pins.filter(p => p.standing).length;
  }

  /**
   * Count how many pins were knocked down (from original 10 or remaining).
   */
  countKnockedDown(): number {
    return this.pins.filter(p => !p.standing).length;
  }

  /**
   * Start the sweep animation to clear fallen pins.
   */
  startSweep(resetAll: boolean = true, onComplete?: () => void) {
    this.sweepInProgress = true;
    this.respawnPhase = 'sweep';
    this.sweepProgress = 0;
    this.sweepBar.visible = true;
    this.sweepBar.position.y = 1.0;
    this.sweepBar.position.z = LANE.HEADPIN_Z + 2;

    const animate = () => {
      this.sweepProgress += 0.02;
      if (this.sweepProgress < 1) {
        // Sweep bar moves across pin area
        this.sweepBar.position.z = LANE.HEADPIN_Z + 2 - this.sweepProgress * 4;
        this.sweepBar.position.y = 0.25;

        // Hide fallen pins as sweep bar passes
        for (const pin of this.pins) {
          if (!pin.standing && pin.position.z > this.sweepBar.position.z - 0.5) {
            pin.mesh.visible = false;
          }
        }
        requestAnimationFrame(animate);
      } else {
        // Sweep complete
        this.sweepBar.visible = false;
        this.respawnPhase = 'respawn';
        this.respawnTimer = 0;

        if (resetAll) {
          this.resetPins();
        } else {
          // Remove fallen pins, keep standing
          for (const pin of this.pins) {
            if (!pin.standing) {
              this.group.remove(pin.mesh);
            }
          }
          this.pins = this.pins.filter(p => p.standing);
        }

        // Holographic respawn effect
        if (resetAll) {
          this.playRespawnEffect();
        }

        this.sweepInProgress = false;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  private playRespawnEffect() {
    // Holographic materialization: pins start transparent, flicker in
    for (const pin of this.pins) {
      pin.mesh.traverse(child => {
        if (child instanceof Mesh) {
          const mat = child.material as MeshStandardMaterial | MeshBasicMaterial;
          if (mat.transparent !== undefined) {
            mat.transparent = true;
            mat.opacity = 0;
          }
        }
      });
    }

    let progress = 0;
    const fadeIn = () => {
      progress += 0.03;
      if (progress < 1) {
        const flicker = Math.random() > 0.3 ? progress : progress * 0.5;
        for (const pin of this.pins) {
          pin.mesh.traverse(child => {
            if (child instanceof Mesh) {
              const mat = child.material as any;
              if (mat.opacity !== undefined) {
                mat.opacity = Math.min(flicker, mat.userData?.targetOpacity ?? 1);
              }
            }
          });
        }
        requestAnimationFrame(fadeIn);
      } else {
        // Fully visible
        for (const pin of this.pins) {
          pin.mesh.traverse(child => {
            if (child instanceof Mesh) {
              const mat = child.material as any;
              mat.opacity = 1;
              mat.transparent = false;
            }
          });
        }
        this.respawnPhase = 'idle';
      }
    };
    requestAnimationFrame(fadeIn);
  }
}
