/**
 * Astro Bowl VR — Ball System
 * Ball physics, rolling, gutter detection, throwing mechanics, ball types.
 * VR: grip to grab, track controller velocity, trigger release to throw.
 * Browser: click-drag aim, hold to charge power, release to throw.
 */
import {
  Group, Mesh, SphereGeometry, CylinderGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Vector3, Quaternion,
  AdditiveBlending, BufferGeometry, Float32BufferAttribute,
} from '@iwsdk/core';
import { LANE } from './lane';

export interface BallType {
  name: string;
  description: string;
  mass: number;
  speedMult: number;
  hookStrength: number; // 0 = straight, 1 = heavy hook
  color: Color;
  emissive: Color;
  special: string; // special behavior
}

export const BALL_TYPES: Record<string, BallType> = {
  standard: {
    name: 'Standard',
    description: 'Well-balanced ball for all situations',
    mass: 6.35, // ~14 lbs
    speedMult: 1.0,
    hookStrength: 0.0,
    color: new Color(0x00ddff),
    emissive: new Color(0x003344),
    special: 'none',
  },
  heavy: {
    name: 'Heavy',
    description: 'Maximum pin devastation, lower speed',
    mass: 7.26, // ~16 lbs
    speedMult: 0.85,
    hookStrength: 0.0,
    color: new Color(0xff4400),
    emissive: new Color(0x441100),
    special: 'none',
  },
  curve: {
    name: 'Curve',
    description: 'Natural hook for hitting the pocket',
    mass: 6.35,
    speedMult: 0.95,
    hookStrength: 0.6,
    color: new Color(0xaa00ff),
    emissive: new Color(0x220044),
    special: 'none',
  },
  split_seeker: {
    name: 'Split Seeker',
    description: 'Wide break for cleaning up splits',
    mass: 5.9,
    speedMult: 0.9,
    hookStrength: 0.9,
    color: new Color(0x00ff44),
    emissive: new Color(0x004411),
    special: 'none',
  },
  phantom: {
    name: 'Phantom',
    description: 'Phases through front pin, hits the back',
    mass: 6.35,
    speedMult: 1.0,
    hookStrength: 0.0,
    color: new Color(0x8800ff),
    emissive: new Color(0x220044),
    special: 'phantom',
  },
  ricochet: {
    name: 'Ricochet',
    description: 'Bounces off gutters back onto the lane',
    mass: 5.9,
    speedMult: 1.05,
    hookStrength: 0.0,
    color: new Color(0xff8800),
    emissive: new Color(0x442200),
    special: 'ricochet',
  },
  magnetar: {
    name: 'Magnetar',
    description: 'Attracts nearby pins toward impact point',
    mass: 7.0,
    speedMult: 0.9,
    hookStrength: 0.15,
    color: new Color(0xff0088),
    emissive: new Color(0x440022),
    special: 'magnetar',
  },
  wormhole: {
    name: 'Wormhole',
    description: 'Teleports forward past the arrows, surprise angle',
    mass: 6.35,
    speedMult: 1.1,
    hookStrength: 0.0,
    color: new Color(0x00ff88),
    emissive: new Color(0x004422),
    special: 'wormhole',
  },
};

const BALL_RADIUS = 0.109; // ~4.3 inches radius
const LANE_FRICTION = 0.985;
const GUTTER_FRICTION = 0.95;

export enum BallState {
  ON_RETURN = 'on_return',
  HELD = 'held',
  ROLLING = 'rolling',
  IN_GUTTER = 'in_gutter',
  AT_PINS = 'at_pins',
  DONE = 'done',
}

export class BallController {
  group: Group;
  mesh: Group;
  position: Vector3;
  velocity: Vector3;
  spin: Vector3;
  state: BallState = BallState.ON_RETURN;
  ballType: BallType;
  private trailPoints: Vector3[] = [];
  private trailMesh: LineSegments;
  private glowMesh: Mesh;
  private rollRotation: number = 0;
  inGutter: boolean = false;
  phantomPhased: boolean = false;
  private phantomPhaseCount: number = 0;

  constructor(ballTypeName: string = 'standard') {
    this.group = new Group();
    this.ballType = BALL_TYPES[ballTypeName] || BALL_TYPES.standard;
    this.position = new Vector3(LANE.BALL_RETURN_X, LANE.SURFACE_Y + BALL_RADIUS + 0.62, LANE.BALL_RETURN_Z);
    this.velocity = new Vector3();
    this.spin = new Vector3();

    this.mesh = this.createBallMesh();
    this.mesh.position.copy(this.position);
    this.group.add(this.mesh);

    this.trailMesh = this.createTrail();
    this.group.add(this.trailMesh);

    this.glowMesh = this.createGlow();
    this.group.add(this.glowMesh);
  }

  private createBallMesh(): Group {
    const ballGroup = new Group();

    // Main ball
    const mat = new MeshStandardMaterial({
      color: this.ballType.color,
      roughness: 0.15,
      metalness: 0.7,
      emissive: this.ballType.emissive,
      emissiveIntensity: 0.3,
    });
    const sphere = new Mesh(new SphereGeometry(BALL_RADIUS, 24, 24), mat);
    ballGroup.add(sphere);

    // Wireframe overlay
    const wireMat = new LineBasicMaterial({
      color: this.ballType.color,
      transparent: true,
      opacity: 0.2,
    });
    const edges = new EdgesGeometry(new SphereGeometry(BALL_RADIUS + 0.001, 12, 12));
    const wire = new LineSegments(edges, wireMat);
    ballGroup.add(wire);

    // Finger holes
    const holeMat = new MeshBasicMaterial({ color: 0x000000 });
    const holeGeo = new CylinderGeometry(0.015, 0.015, 0.02, 8);
    for (let i = 0; i < 3; i++) {
      const hole = new Mesh(holeGeo, holeMat);
      const angle = (i / 3) * Math.PI * 0.6 - 0.3;
      hole.position.set(
        Math.sin(angle) * BALL_RADIUS * 0.5,
        BALL_RADIUS * 0.8,
        Math.cos(angle) * BALL_RADIUS * 0.5,
      );
      hole.lookAt(0, 0, 0);
      ballGroup.add(hole);
    }

    return ballGroup;
  }

  private createTrail(): LineSegments {
    const geo = new BufferGeometry();
    const positions = new Float32Array(300); // 100 points * 3
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const mat = new LineBasicMaterial({
      color: this.ballType.color,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
    });
    const trail = new LineSegments(geo, mat);
    trail.frustumCulled = false;
    return trail;
  }

  private createGlow(): Mesh {
    const mat = new MeshBasicMaterial({
      color: this.ballType.color,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    return new Mesh(new SphereGeometry(BALL_RADIUS * 1.8, 16, 16), mat);
  }

  setBallType(typeName: string) {
    const newType = BALL_TYPES[typeName];
    if (!newType) return;
    this.ballType = newType;

    // Update ball visuals
    this.group.remove(this.mesh);
    this.mesh = this.createBallMesh();
    this.mesh.position.copy(this.position);
    this.group.add(this.mesh);

    // Update trail and glow colors
    (this.trailMesh.material as LineBasicMaterial).color.copy(newType.color);
    (this.glowMesh.material as MeshBasicMaterial).color.copy(newType.color);
  }

  resetToReturn() {
    this.position.set(LANE.BALL_RETURN_X, LANE.SURFACE_Y + BALL_RADIUS + 0.62, LANE.BALL_RETURN_Z);
    this.velocity.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.state = BallState.ON_RETURN;
    this.inGutter = false;
    this.phantomPhased = false;
    this.phantomPhaseCount = 0;
    this.mesh.position.copy(this.position);
    this.glowMesh.position.copy(this.position);
    this.trailPoints = [];
    this.mesh.visible = true;
    this.rollRotation = 0;
  }

  /**
   * Throw the ball with a given velocity vector.
   */
  throw(velocity: Vector3) {
    this.state = BallState.ROLLING;
    this.velocity.copy(velocity);
    this.velocity.multiplyScalar(this.ballType.speedMult);
    this.position.set(
      Math.max(-LANE.LANE_WIDTH / 2 + BALL_RADIUS, Math.min(LANE.LANE_WIDTH / 2 - BALL_RADIUS, this.position.x)),
      LANE.SURFACE_Y + BALL_RADIUS,
      LANE.FOUL_LINE_Z - 0.1,
    );
    this.inGutter = false;
    this.trailPoints = [];
  }

  /**
   * Update ball physics each frame. Returns true if ball reached pin area or is done.
   */
  update(dt: number): { reachedPins: boolean; inGutter: boolean; done: boolean } {
    if (this.state === BallState.ON_RETURN || this.state === BallState.HELD || this.state === BallState.DONE) {
      this.glowMesh.position.copy(this.position);
      return { reachedPins: false, inGutter: false, done: this.state === BallState.DONE };
    }

    // Apply hook (curve effect)
    if (this.ballType.hookStrength > 0 && !this.inGutter) {
      const hookForce = this.ballType.hookStrength * 0.5;
      // Hook breaks left for right-handers (negative x)
      this.velocity.x -= hookForce * dt * Math.sign(this.velocity.z || -1);
    }

    // Update position
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Friction
    const friction = this.inGutter ? GUTTER_FRICTION : LANE_FRICTION;
    this.velocity.x *= friction;
    this.velocity.z *= friction;

    // Keep ball on lane surface
    this.position.y = this.inGutter
      ? LANE.SURFACE_Y - LANE.GUTTER_DEPTH + BALL_RADIUS
      : LANE.SURFACE_Y + BALL_RADIUS;

    // Gutter detection
    const halfLane = LANE.LANE_WIDTH / 2;
    if (!this.inGutter && Math.abs(this.position.x) > halfLane) {
      // Ricochet ball bounces back from gutter
      if (this.ballType.special === 'ricochet') {
        this.velocity.x *= -0.7;
        this.position.x = Math.sign(this.position.x) * (halfLane - 0.01);
      } else {
        this.inGutter = true;
        this.state = BallState.IN_GUTTER;
      }
    }

    // Keep in gutter bounds
    if (this.inGutter) {
      const gutterEdge = halfLane + LANE.GUTTER_WIDTH;
      if (Math.abs(this.position.x) > gutterEdge) {
        this.position.x = Math.sign(this.position.x) * gutterEdge;
        this.velocity.x = 0;
      }
    }

    // Ball rotation (visual rolling effect)
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    this.rollRotation += speed * dt * 10;
    this.mesh.rotation.x = this.rollRotation;

    // Trail
    if (speed > 0.1) {
      this.trailPoints.push(this.position.clone());
      if (this.trailPoints.length > 80) this.trailPoints.shift();
      this.updateTrail();
    }

    // Phantom ball special behavior
    if (this.ballType.special === 'phantom' && !this.phantomPhased) {
      // Phase through front pin area (headpin)
      if (this.position.z < LANE.HEADPIN_Z + 0.2 && this.position.z > LANE.HEADPIN_Z - 0.2) {
        // Make ball semi-transparent
        this.mesh.traverse(child => {
          if (child instanceof Mesh) {
            const mat = child.material as any;
            if (mat.opacity !== undefined) mat.opacity = 0.3;
            mat.transparent = true;
          }
        });
        this.phantomPhased = true;
      }
    }

    // Wormhole ball teleport (jumps forward past arrows)
    if (this.ballType.special === 'wormhole' && !this.phantomPhased) {
      if (this.position.z < LANE.ARROW_Z + 1 && this.position.z > LANE.ARROW_Z - 1) {
        this.phantomPhased = true;
        // Teleport forward with slight random offset
        this.position.z = LANE.HEADPIN_Z + 2;
        this.position.x += (Math.random() - 0.5) * 0.3;
        // Brief transparency effect (reuse phantom flag)
        this.mesh.traverse(child => {
          if (child instanceof Mesh) {
            const mat = child.material as any;
            if (mat.opacity !== undefined) {
              mat.transparent = true;
              mat.opacity = 0.5;
            }
          }
        });
        // Restore opacity after short delay
        setTimeout(() => {
          this.mesh.traverse(child => {
            if (child instanceof Mesh) {
              const mat = child.material as any;
              mat.opacity = 1;
              mat.transparent = false;
            }
          });
        }, 300);
      }
    }

    // Check if reached pin area
    const reachedPins = this.position.z <= LANE.HEADPIN_Z + 0.3 && !this.inGutter;

    // Check if ball is past backstop or stopped
    const done = this.position.z < LANE.BACKSTOP_Z - 0.5 || speed < 0.05;

    if (done) {
      this.state = BallState.DONE;
    }

    // Update mesh position
    this.mesh.position.copy(this.position);
    this.glowMesh.position.copy(this.position);

    // Glow intensity based on speed
    const glowIntensity = Math.min(0.3, speed * 0.05);
    (this.glowMesh.material as MeshBasicMaterial).opacity = glowIntensity;

    return { reachedPins, inGutter: this.inGutter, done };
  }

  private updateTrail() {
    if (this.trailPoints.length < 2) return;
    const positions: number[] = [];
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      const p1 = this.trailPoints[i];
      const p2 = this.trailPoints[i + 1];
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }

    const geo = this.trailMesh.geometry;
    const posAttr = geo.getAttribute('position');
    const arr = posAttr.array as Float32Array;
    arr.fill(0);
    for (let i = 0; i < Math.min(positions.length, arr.length); i++) {
      arr[i] = positions[i];
    }
    posAttr.needsUpdate = true;
    geo.setDrawRange(0, Math.min(positions.length / 3, 200));
  }

  getRadius(): number {
    return BALL_RADIUS;
  }
}
