/**
 * Astro Bowl VR — Aim Indicator
 * Projected trajectory line showing ball direction in browser mode.
 */
import {
  Group, LineSegments, BufferGeometry, Float32BufferAttribute,
  LineBasicMaterial, Color, AdditiveBlending, Mesh, ConeGeometry,
  MeshBasicMaterial, Vector3,
} from '@iwsdk/core';
import { LANE } from './lane';

export class AimIndicator {
  group: Group;
  private line: LineSegments;
  private arrow: Mesh;
  private visible: boolean = false;
  private aimX: number = 0;
  private power: number = 0;

  constructor(color: Color) {
    this.group = new Group();

    // Trajectory line
    const lineGeo = new BufferGeometry();
    const positions = new Float32Array(60); // 20 segments * 3
    lineGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const lineMat = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
    });
    this.line = new LineSegments(lineGeo, lineMat);
    this.line.frustumCulled = false;
    this.group.add(this.line);

    // Arrow tip
    const arrowMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });
    this.arrow = new Mesh(new ConeGeometry(0.06, 0.2, 8), arrowMat);
    this.arrow.rotation.x = Math.PI / 2; // Point forward (-Z)
    this.group.add(this.arrow);

    this.hide();
  }

  show() {
    this.visible = true;
    this.group.visible = true;
  }

  hide() {
    this.visible = false;
    this.group.visible = false;
  }

  /**
   * Update aim based on lateral offset and power.
   */
  update(aimX: number, power: number) {
    if (!this.visible) return;

    this.aimX = aimX;
    this.power = power;

    const startZ = LANE.FOUL_LINE_Z - 0.1;
    const speed = 3 + power * 9;
    const endZ = startZ - Math.min(speed * 2.5, Math.abs(LANE.HEADPIN_Z - startZ));

    const segments = 20;
    const positions: number[] = [];
    const y = LANE.SURFACE_Y + 0.05;

    for (let i = 0; i < segments - 1; i++) {
      const t1 = i / (segments - 1);
      const t2 = (i + 1) / (segments - 1);

      const z1 = startZ + (endZ - startZ) * t1;
      const z2 = startZ + (endZ - startZ) * t2;
      const x1 = aimX * 2 * t1; // Lateral drift
      const x2 = aimX * 2 * t2;

      positions.push(x1, y, z1, x2, y, z2);
    }

    const geo = this.line.geometry;
    const posAttr = geo.getAttribute('position');
    const arr = posAttr.array as Float32Array;
    arr.fill(0);
    for (let i = 0; i < Math.min(positions.length, arr.length); i++) {
      arr[i] = positions[i];
    }
    posAttr.needsUpdate = true;
    geo.setDrawRange(0, Math.min(positions.length / 3, 40));

    // Update opacity based on power
    (this.line.material as LineBasicMaterial).opacity = 0.3 + power * 0.4;
    (this.arrow.material as MeshBasicMaterial).opacity = 0.4 + power * 0.4;

    // Position arrow at end of line
    const lastX = aimX * 2;
    this.arrow.position.set(lastX, y + 0.02, endZ);
  }
}
