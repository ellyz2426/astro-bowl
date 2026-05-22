/**
 * Astro Bowl VR — Lane Effects
 * Animated speed strips, oil pattern visualization, lane glow pulses,
 * and arrow highlight animations for the holodeck aesthetic.
 */
import {
  Group, Mesh, BoxGeometry, PlaneGeometry,
  MeshBasicMaterial, ShaderMaterial, Color, Vector3,
  AdditiveBlending, BufferGeometry, Float32BufferAttribute,
} from '@iwsdk/core';
import { LANE } from './lane';

export class LaneEffects {
  group: Group;
  private speedStrips: Mesh[] = [];
  private oilPatternMesh: Mesh | null = null;
  private arrowGlows: Mesh[] = [];
  private impactRings: { mesh: Mesh; life: number; maxLife: number; scale: number }[] = [];
  private primaryColor: Color;

  constructor(primaryColor: Color) {
    this.group = new Group();
    this.primaryColor = primaryColor;
    this.createSpeedStrips();
    this.createOilPattern();
    this.createArrowGlows();
  }

  /**
   * Animated speed strips that flow down the lane.
   */
  private createSpeedStrips() {
    const stripMat = new MeshBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
    });

    for (let i = 0; i < 6; i++) {
      const strip = new Mesh(
        new BoxGeometry(0.02, 0.002, 0.8),
        stripMat.clone(),
      );
      const x = (i - 2.5) * (LANE.LANE_WIDTH / 6);
      strip.position.set(x, LANE.SURFACE_Y + 0.008, LANE.FOUL_LINE_Z - 3);
      strip.userData.phase = i * Math.PI / 3;
      strip.userData.speed = 2 + Math.random();
      this.speedStrips.push(strip);
      this.group.add(strip);
    }
  }

  /**
   * Visualize the oil pattern on the lane as a subtle gradient.
   */
  private createOilPattern() {
    const oilMat = new MeshBasicMaterial({
      color: new Color(0x002244),
      transparent: true,
      opacity: 0.06,
      blending: AdditiveBlending,
    });

    // Oil pattern: heavier in center, lighter at edges
    // Standard house pattern extends about 40 feet
    const oilLength = 12; // meters
    const oil = new Mesh(
      new PlaneGeometry(LANE.LANE_WIDTH * 0.8, oilLength),
      oilMat,
    );
    oil.rotation.x = -Math.PI / 2;
    oil.position.set(0, LANE.SURFACE_Y + 0.003, LANE.FOUL_LINE_Z - oilLength / 2);
    this.oilPatternMesh = oil;
    this.group.add(oil);

    // Lighter oil strips at edges
    for (const side of [-1, 1]) {
      const edgeOil = new Mesh(
        new PlaneGeometry(LANE.LANE_WIDTH * 0.15, oilLength * 0.7),
        new MeshBasicMaterial({
          color: new Color(0x001122),
          transparent: true,
          opacity: 0.03,
          blending: AdditiveBlending,
        }),
      );
      edgeOil.rotation.x = -Math.PI / 2;
      edgeOil.position.set(
        side * LANE.LANE_WIDTH * 0.35,
        LANE.SURFACE_Y + 0.003,
        LANE.FOUL_LINE_Z - oilLength * 0.35,
      );
      this.group.add(edgeOil);
    }
  }

  /**
   * Glowing arrow indicators that pulse.
   */
  private createArrowGlows() {
    const arrowPositions = [-0.27, -0.135, 0, 0.135, 0.27];
    for (const x of arrowPositions) {
      const glow = new Mesh(
        new BoxGeometry(0.08, 0.002, 0.15),
        new MeshBasicMaterial({
          color: this.primaryColor,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
        }),
      );
      glow.position.set(x, LANE.SURFACE_Y + 0.007, LANE.ARROW_Z);
      this.arrowGlows.push(glow);
      this.group.add(glow);
    }
  }

  /**
   * Play a speed strip animation when ball is thrown.
   */
  activateSpeedStrips() {
    for (const strip of this.speedStrips) {
      strip.userData.active = true;
      strip.userData.timer = 0;
    }
  }

  deactivateSpeedStrips() {
    for (const strip of this.speedStrips) {
      strip.userData.active = false;
    }
  }

  /**
   * Spawn an impact ring at the pin area.
   */
  spawnImpactRing(position: Vector3, color: Color) {
    const ringMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      side: 2, // DoubleSide
    });
    const ring = new Mesh(
      new PlaneGeometry(0.1, 0.1),
      ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = LANE.SURFACE_Y + 0.01;
    this.group.add(ring);

    this.impactRings.push({
      mesh: ring,
      life: 1.0,
      maxLife: 1.0,
      scale: 0.1,
    });
  }

  /**
   * Highlight arrows based on aim direction.
   */
  highlightArrows(aimX: number, intensity: number) {
    const positions = [-0.27, -0.135, 0, 0.135, 0.27];
    for (let i = 0; i < this.arrowGlows.length; i++) {
      const dist = Math.abs(positions[i] - aimX * 0.3);
      const brightness = Math.max(0, 1 - dist * 5) * intensity;
      (this.arrowGlows[i].material as MeshBasicMaterial).opacity = brightness * 0.4;
    }
  }

  clearArrowHighlights() {
    for (const glow of this.arrowGlows) {
      (glow.material as MeshBasicMaterial).opacity = 0;
    }
  }

  update(time: number, dt: number) {
    // Animate speed strips
    for (const strip of this.speedStrips) {
      if (strip.userData.active) {
        strip.userData.timer = (strip.userData.timer || 0) + dt;
        const t = strip.userData.timer;
        const progress = (t * strip.userData.speed + strip.userData.phase) % 1;
        strip.position.z = LANE.FOUL_LINE_Z - progress * Math.abs(LANE.LANE_END_Z - LANE.FOUL_LINE_Z);
        (strip.material as MeshBasicMaterial).opacity = 0.15 * Math.sin(progress * Math.PI);

        // Auto-deactivate after 3 seconds
        if (t > 3) {
          strip.userData.active = false;
          (strip.material as MeshBasicMaterial).opacity = 0;
        }
      }
    }

    // Animate impact rings
    for (let i = this.impactRings.length - 1; i >= 0; i--) {
      const ring = this.impactRings[i];
      ring.life -= dt;
      if (ring.life <= 0) {
        this.group.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as MeshBasicMaterial).dispose();
        this.impactRings.splice(i, 1);
        continue;
      }
      ring.scale += dt * 4;
      ring.mesh.scale.setScalar(ring.scale);
      const lifeRatio = ring.life / ring.maxLife;
      (ring.mesh.material as MeshBasicMaterial).opacity = lifeRatio * 0.6;
    }

    // Subtle arrow pulse
    const arrowPulse = Math.sin(time * 1.5) * 0.02 + 0.02;
    for (const glow of this.arrowGlows) {
      if ((glow.material as MeshBasicMaterial).opacity < 0.01) {
        (glow.material as MeshBasicMaterial).opacity = arrowPulse;
      }
    }
  }

  dispose() {
    for (const ring of this.impactRings) {
      this.group.remove(ring.mesh);
      ring.mesh.geometry.dispose();
      (ring.mesh.material as MeshBasicMaterial).dispose();
    }
    this.impactRings = [];
  }
}
