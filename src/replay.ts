/**
 * Astro Bowl VR — Replay Camera System
 * Cinematic slow-motion replays from multiple angles after strikes and spares.
 * Records ball path and pin hits, then plays back with camera cuts.
 */
import { Vector3, Color, Group, Mesh, SphereGeometry, MeshBasicMaterial,
  AdditiveBlending, BufferGeometry, Float32BufferAttribute, LineSegments,
  LineBasicMaterial } from '@iwsdk/core';

export interface ReplayFrame {
  time: number;
  ballPos: Vector3;
  ballVel: Vector3;
  pinsHit: number;
  inGutter: boolean;
}

export interface CameraAngle {
  name: string;
  position: Vector3;
  lookAt: Vector3;
  duration: number; // seconds for this cut
}

const REPLAY_ANGLES: CameraAngle[] = [
  {
    name: 'bowler_view',
    position: new Vector3(0, 2.0, 2),
    lookAt: new Vector3(0, 0.3, -15),
    duration: 1.5,
  },
  {
    name: 'side_track',
    position: new Vector3(2.5, 1.2, -8),
    lookAt: new Vector3(0, 0.3, -15),
    duration: 1.0,
  },
  {
    name: 'pin_view',
    position: new Vector3(0.5, 0.4, -16),
    lookAt: new Vector3(0, 0.5, -5),
    duration: 1.2,
  },
  {
    name: 'overhead',
    position: new Vector3(0, 5, -8),
    lookAt: new Vector3(0, 0, -15),
    duration: 1.0,
  },
  {
    name: 'dramatic_low',
    position: new Vector3(-1, 0.2, -12),
    lookAt: new Vector3(0, 0.5, -15),
    duration: 1.5,
  },
];

export class ReplayManager {
  group: Group;
  recording: boolean = false;
  playing: boolean = false;
  frames: ReplayFrame[] = [];
  private playbackTime: number = 0;
  private totalDuration: number = 0;
  private playbackSpeed: number = 0.35; // 35% speed for slo-mo
  private currentAngleIndex: number = 0;
  private angleTimer: number = 0;
  private ghostBall: Mesh;
  private ghostTrail: LineSegments;
  private trailPositions: Vector3[] = [];
  private onComplete: (() => void) | null = null;
  private onCameraUpdate: ((pos: Vector3, lookAt: Vector3) => void) | null = null;
  enabled: boolean = true;

  // Minimum event quality for replay (avoid replaying gutters)
  minPinsForReplay: number = 8;

  constructor() {
    this.group = new Group();
    this.group.visible = false;

    // Ghost ball for replay visualization
    const ghostMat = new MeshBasicMaterial({
      color: new Color(0x00ffff),
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });
    this.ghostBall = new Mesh(new SphereGeometry(0.12, 16, 16), ghostMat);
    this.group.add(this.ghostBall);

    // Ghost trail
    const trailGeo = new BufferGeometry();
    trailGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(600), 3));
    const trailMat = new LineBasicMaterial({
      color: new Color(0x00ffff),
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    this.ghostTrail = new LineSegments(trailGeo, trailMat);
    this.ghostTrail.frustumCulled = false;
    this.group.add(this.ghostTrail);
  }

  /**
   * Start recording ball positions for a potential replay.
   */
  startRecording() {
    this.frames = [];
    this.recording = true;
    this.trailPositions = [];
  }

  /**
   * Record a frame during ball rolling.
   */
  recordFrame(ballPos: Vector3, ballVel: Vector3, pinsHit: number, inGutter: boolean) {
    if (!this.recording) return;
    this.frames.push({
      time: this.frames.length > 0
        ? this.frames[this.frames.length - 1].time + 1 / 60
        : 0,
      ballPos: ballPos.clone(),
      ballVel: ballVel.clone(),
      pinsHit,
      inGutter,
    });
  }

  /**
   * Stop recording. Returns true if the roll qualifies for replay.
   */
  stopRecording(totalPinsKnocked: number): boolean {
    this.recording = false;
    return this.enabled && totalPinsKnocked >= this.minPinsForReplay && this.frames.length > 10;
  }

  /**
   * Play the recorded replay with cinematic camera cuts.
   */
  startPlayback(
    onCameraUpdate: (pos: Vector3, lookAt: Vector3) => void,
    onComplete: () => void,
  ) {
    if (this.frames.length === 0) {
      onComplete();
      return;
    }

    this.playing = true;
    this.playbackTime = 0;
    this.totalDuration = this.frames[this.frames.length - 1].time;
    this.currentAngleIndex = 0;
    this.angleTimer = 0;
    this.trailPositions = [];
    this.onCameraUpdate = onCameraUpdate;
    this.onComplete = onComplete;
    this.group.visible = true;
  }

  /**
   * Skip/cancel the replay.
   */
  skipPlayback() {
    if (!this.playing) return;
    this.playing = false;
    this.group.visible = false;
    if (this.onComplete) this.onComplete();
  }

  /**
   * Update replay playback each frame.
   */
  update(dt: number) {
    if (!this.playing) return;

    this.playbackTime += dt * this.playbackSpeed;
    this.angleTimer += dt * this.playbackSpeed;

    // Find the current recorded frame
    const currentTime = this.playbackTime;
    let frameIdx = 0;
    for (let i = 0; i < this.frames.length; i++) {
      if (this.frames[i].time <= currentTime) {
        frameIdx = i;
      } else {
        break;
      }
    }

    const frame = this.frames[frameIdx];
    if (!frame) {
      this.endPlayback();
      return;
    }

    // Position ghost ball
    this.ghostBall.position.copy(frame.ballPos);

    // Build trail
    this.trailPositions.push(frame.ballPos.clone());
    if (this.trailPositions.length > 100) this.trailPositions.shift();
    this.updateGhostTrail();

    // Pulse ghost ball
    const pulse = 0.4 + Math.sin(this.playbackTime * 8) * 0.2;
    (this.ghostBall.material as MeshBasicMaterial).opacity = pulse;

    // Camera angle management
    const angle = REPLAY_ANGLES[this.currentAngleIndex % REPLAY_ANGLES.length];
    if (this.angleTimer >= angle.duration) {
      this.angleTimer = 0;
      this.currentAngleIndex++;
      if (this.currentAngleIndex >= REPLAY_ANGLES.length) {
        this.currentAngleIndex = 0;
      }
    }

    // Smooth camera tracking — interpolate toward ball position
    const camAngle = REPLAY_ANGLES[this.currentAngleIndex % REPLAY_ANGLES.length];
    const camPos = camAngle.position.clone();
    const camLookAt = frame.ballPos.clone();
    camLookAt.y = Math.max(0.3, camLookAt.y);

    if (this.onCameraUpdate) {
      this.onCameraUpdate(camPos, camLookAt);
    }

    // Check if replay is done
    if (currentTime >= this.totalDuration) {
      this.endPlayback();
    }
  }

  private endPlayback() {
    this.playing = false;
    this.group.visible = false;
    if (this.onComplete) this.onComplete();
  }

  private updateGhostTrail() {
    if (this.trailPositions.length < 2) return;
    const positions: number[] = [];
    for (let i = 0; i < this.trailPositions.length - 1; i++) {
      const p1 = this.trailPositions[i];
      const p2 = this.trailPositions[i + 1];
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }

    const geo = this.ghostTrail.geometry;
    const posAttr = geo.getAttribute('position');
    const arr = posAttr.array as Float32Array;
    arr.fill(0);
    for (let i = 0; i < Math.min(positions.length, arr.length); i++) {
      arr[i] = positions[i];
    }
    posAttr.needsUpdate = true;
    geo.setDrawRange(0, Math.min(positions.length / 3, 200));
  }
}
