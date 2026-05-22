/**
 * Astro Bowl VR — Neighboring Lanes
 * Visual-only neighboring lanes for environmental depth and immersion.
 * Shows phantom bowlers on adjacent lanes with ambient activity.
 */
import {
  Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Vector3,
  AdditiveBlending, BufferGeometry, Float32BufferAttribute,
} from '@iwsdk/core';
import { LANE } from './lane';

export class NeighboringLanes {
  group: Group;
  private lanes: { group: Group; pins: Mesh[]; ball: Mesh; activity: number }[] = [];
  private primaryColor: Color;
  private secondaryColor: Color;

  constructor(primaryColor: Color, secondaryColor: Color) {
    this.group = new Group();
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;

    // Create 2 lanes on each side
    this.createNeighborLane(-1, 3.5);  // Left close
    this.createNeighborLane(-1, 7.0);  // Left far
    this.createNeighborLane(1, 3.5);   // Right close
    this.createNeighborLane(1, 7.0);   // Right far
  }

  private createNeighborLane(side: number, offset: number) {
    const laneGroup = new Group();
    const x = side * offset;

    // Dimmed lane surface
    const laneMat = new MeshStandardMaterial({
      color: 0x060612,
      roughness: 0.2,
      metalness: 0.7,
      transparent: true,
      opacity: 0.6,
    });
    const laneLength = Math.abs(LANE.LANE_END_Z - LANE.LANE_START_Z);
    const laneSurface = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH, 0.03, laneLength),
      laneMat,
    );
    laneSurface.position.set(x, LANE.SURFACE_Y - 0.015, LANE.LANE_START_Z - laneLength / 2);
    laneGroup.add(laneSurface);

    // Lane edge lines
    const edgeMat = new LineBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.15,
    });
    for (const edgeSide of [-1, 1]) {
      const edgeX = x + edgeSide * LANE.LANE_WIDTH / 2;
      const points = [
        edgeX, LANE.SURFACE_Y + 0.005, LANE.LANE_START_Z,
        edgeX, LANE.SURFACE_Y + 0.005, LANE.LANE_END_Z,
      ];
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(points, 3));
      const edge = new LineSegments(geo, edgeMat);
      laneGroup.add(edge);
    }

    // Foul line
    const foulMat = new MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.3,
    });
    const foulLine = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH, 0.01, 0.03),
      foulMat,
    );
    foulLine.position.set(x, LANE.SURFACE_Y + 0.005, LANE.FOUL_LINE_Z);
    laneGroup.add(foulLine);

    // Ghost pins (simplified)
    const pins: Mesh[] = [];
    const pinMat = new MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.25,
      emissive: this.primaryColor,
      emissiveIntensity: 0.03,
    });
    const pinPositions = this.getGhostPinPositions(x);
    for (const pos of pinPositions) {
      const pin = new Mesh(new CylinderGeometry(0.04, 0.05, 0.3, 8), pinMat.clone());
      pin.position.set(pos.x, LANE.SURFACE_Y + 0.15, pos.z);
      laneGroup.add(pin);
      pins.push(pin);
    }

    // Ghost ball on return
    const ballMat = new MeshStandardMaterial({
      color: this.secondaryColor,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.2,
    });
    const ball = new Mesh(new SphereGeometry(0.1, 12, 12), ballMat);
    ball.position.set(x + 0.7, LANE.SURFACE_Y + 0.72, LANE.BALL_RETURN_Z);
    laneGroup.add(ball);

    // Gutter glow strips
    const gutterGlowMat = new MeshBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.08,
      blending: AdditiveBlending,
    });
    for (const gs of [-1, 1]) {
      const gutterGlow = new Mesh(
        new BoxGeometry(0.01, 0.005, laneLength),
        gutterGlowMat,
      );
      gutterGlow.position.set(
        x + gs * (LANE.LANE_WIDTH / 2 + LANE.GUTTER_WIDTH / 2),
        LANE.SURFACE_Y + 0.003,
        LANE.LANE_START_Z - laneLength / 2,
      );
      laneGroup.add(gutterGlow);
    }

    this.group.add(laneGroup);
    this.lanes.push({
      group: laneGroup,
      pins,
      ball,
      activity: Math.random() * 10,
    });
  }

  private getGhostPinPositions(centerX: number): { x: number; z: number }[] {
    const sp = LANE.PIN_SPACING;
    const startZ = LANE.HEADPIN_Z;
    return [
      { x: centerX, z: startZ },
      { x: centerX - sp / 2, z: startZ - sp * 0.866 },
      { x: centerX + sp / 2, z: startZ - sp * 0.866 },
      { x: centerX - sp, z: startZ - sp * 0.866 * 2 },
      { x: centerX, z: startZ - sp * 0.866 * 2 },
      { x: centerX + sp, z: startZ - sp * 0.866 * 2 },
      { x: centerX - sp * 1.5, z: startZ - sp * 0.866 * 3 },
      { x: centerX - sp / 2, z: startZ - sp * 0.866 * 3 },
      { x: centerX + sp / 2, z: startZ - sp * 0.866 * 3 },
      { x: centerX + sp * 1.5, z: startZ - sp * 0.866 * 3 },
    ];
  }

  /**
   * Animate neighboring lanes with ambient activity.
   */
  update(time: number, dt: number) {
    for (const lane of this.lanes) {
      lane.activity += dt;

      // Periodically "knock down" random pins (visual only)
      const cycle = lane.activity % 12; // 12-second activity cycle
      if (cycle < 6) {
        // Pins standing
        for (const pin of lane.pins) {
          pin.visible = true;
          pin.rotation.x = 0;
          pin.rotation.z = 0;
        }
      } else if (cycle < 7.5) {
        // Ball rolling phase — some pins "knocked"
        const knockCount = Math.floor((cycle - 6) * 5);
        for (let i = 0; i < lane.pins.length; i++) {
          if (i < knockCount) {
            lane.pins[i].rotation.x = Math.PI / 2;
            lane.pins[i].position.y = LANE.SURFACE_Y + 0.03;
            (lane.pins[i].material as MeshStandardMaterial).opacity = 0.1;
          }
        }
      } else {
        // Reset phase
        for (const pin of lane.pins) {
          pin.rotation.x = 0;
          pin.position.y = LANE.SURFACE_Y + 0.15;
          (pin.material as MeshStandardMaterial).opacity = 0.25;
        }
      }

      // Subtle ball bobbing
      lane.ball.position.y = LANE.SURFACE_Y + 0.72 + Math.sin(time * 0.5 + lane.activity) * 0.003;
    }
  }
}
