/**
 * Astro Bowl VR — Bowling Lane
 * Lane geometry: approach area, foul line, lane surface, gutters, pin deck, backstop.
 */
import {
  Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Vector3, DoubleSide,
  AdditiveBlending, Float32BufferAttribute, BufferGeometry,
} from '@iwsdk/core';

// Lane dimensions (meters, roughly to scale)
export const LANE = {
  // Approach area (where player stands)
  APPROACH_LENGTH: 4.5,
  APPROACH_START_Z: 2, // player stands around z=1

  // Foul line at z = -2.5
  FOUL_LINE_Z: -2.5,

  // Lane proper
  LANE_WIDTH: 1.06,  // ~42 inches
  LANE_LENGTH: 18.3, // ~60 feet from foul line to headpin
  LANE_START_Z: -2.5,
  LANE_END_Z: -20.8,

  // Gutters
  GUTTER_WIDTH: 0.23, // ~9 inches
  GUTTER_DEPTH: 0.08,

  // Pin deck
  PIN_DECK_LENGTH: 1.0,
  PIN_DECK_Z: -20.8,

  // Backstop
  BACKSTOP_HEIGHT: 1.0,
  BACKSTOP_Z: -22.0,

  // Arrows / markers
  ARROW_Z: -7.0, // aiming arrows

  // Pin positions (headpin at center, triangle formation)
  HEADPIN_Z: -20.0,
  PIN_SPACING: 0.305, // ~12 inches between pin centers

  // Ball return position
  BALL_RETURN_Z: 0.5,
  BALL_RETURN_X: 0.8,

  SURFACE_Y: 0,
};

export class LaneBuilder {
  group: Group;
  private primaryColor: Color;
  private secondaryColor: Color;
  private accentColor: Color;
  laneEffects: { type: string; z: number; length: number }[] = [];

  constructor(primaryColor: Color, secondaryColor: Color, accentColor: Color) {
    this.group = new Group();
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
    this.accentColor = accentColor;
    this.buildLane();
  }

  private buildLane() {
    // Approach area
    this.createApproachArea();
    // Foul line
    this.createFoulLine();
    // Lane surface
    this.createLaneSurface();
    // Gutters
    this.createGutters();
    // Pin deck
    this.createPinDeck();
    // Backstop
    this.createBackstop();
    // Lane arrows / markers
    this.createArrows();
    // Lane border lights
    this.createBorderLights();
    // Ball return
    this.createBallReturn();
  }

  private createApproachArea() {
    const mat = new MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: 0.9,
    });
    const approach = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH + LANE.GUTTER_WIDTH * 2, 0.05, LANE.APPROACH_LENGTH),
      mat,
    );
    approach.position.set(0, LANE.SURFACE_Y - 0.025, LANE.APPROACH_START_Z - LANE.APPROACH_LENGTH / 2);
    this.group.add(approach);

    // Wireframe overlay
    const edges = new EdgesGeometry(approach.geometry);
    const edgeMat = new LineBasicMaterial({ color: this.primaryColor, transparent: true, opacity: 0.4 });
    const edgeLines = new LineSegments(edges, edgeMat);
    edgeLines.position.copy(approach.position);
    this.group.add(edgeLines);
  }

  private createFoulLine() {
    const mat = new MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.8,
    });
    const foulLine = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH + LANE.GUTTER_WIDTH * 2, 0.02, 0.05),
      mat,
    );
    foulLine.position.set(0, LANE.SURFACE_Y + 0.01, LANE.FOUL_LINE_Z);
    this.group.add(foulLine);

    // Glow
    const glowMat = new MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH + LANE.GUTTER_WIDTH * 2 + 0.1, 0.01, 0.15),
      glowMat,
    );
    glow.position.set(0, LANE.SURFACE_Y + 0.02, LANE.FOUL_LINE_Z);
    this.group.add(glow);
  }

  private createLaneSurface() {
    const mat = new MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.95,
    });
    const laneLength = Math.abs(LANE.LANE_END_Z - LANE.LANE_START_Z);
    const lane = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH, 0.05, laneLength),
      mat,
    );
    lane.position.set(0, LANE.SURFACE_Y - 0.025, LANE.LANE_START_Z - laneLength / 2);
    this.group.add(lane);

    // Lane center line (subtle guide)
    const centerMat = new MeshBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.1,
    });
    const centerLine = new Mesh(
      new BoxGeometry(0.02, 0.01, laneLength),
      centerMat,
    );
    centerLine.position.set(0, LANE.SURFACE_Y + 0.01, LANE.LANE_START_Z - laneLength / 2);
    this.group.add(centerLine);

    // Lane board lines (subtle)
    const boardMat = new LineBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.06,
    });
    const boardSpacing = LANE.LANE_WIDTH / 39; // 39 boards
    for (let i = 0; i <= 39; i++) {
      const x = -LANE.LANE_WIDTH / 2 + i * boardSpacing;
      const points = [x, LANE.SURFACE_Y + 0.005, LANE.LANE_START_Z, x, LANE.SURFACE_Y + 0.005, LANE.LANE_END_Z];
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(points, 3));
      const line = new LineSegments(geo, boardMat);
      this.group.add(line);
    }
  }

  private createGutters() {
    const gutterMat = new MeshStandardMaterial({
      color: 0x050510,
      roughness: 0.5,
      metalness: 0.6,
    });
    const laneLength = Math.abs(LANE.LANE_END_Z - LANE.LANE_START_Z);

    for (const side of [-1, 1]) {
      const x = side * (LANE.LANE_WIDTH / 2 + LANE.GUTTER_WIDTH / 2);
      const gutter = new Mesh(
        new BoxGeometry(LANE.GUTTER_WIDTH, LANE.GUTTER_DEPTH, laneLength),
        gutterMat,
      );
      gutter.position.set(x, LANE.SURFACE_Y - LANE.GUTTER_DEPTH / 2, LANE.LANE_START_Z - laneLength / 2);
      this.group.add(gutter);

      // Gutter edge light
      const edgeMat = new MeshBasicMaterial({
        color: this.secondaryColor,
        transparent: true,
        opacity: 0.3,
      });
      const edge = new Mesh(
        new BoxGeometry(0.02, 0.02, laneLength),
        edgeMat,
      );
      edge.position.set(
        side * LANE.LANE_WIDTH / 2,
        LANE.SURFACE_Y + 0.01,
        LANE.LANE_START_Z - laneLength / 2,
      );
      this.group.add(edge);
    }
  }

  private createPinDeck() {
    const mat = new MeshStandardMaterial({
      color: 0x0c0c20,
      roughness: 0.2,
      metalness: 0.7,
    });
    const deck = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH + LANE.GUTTER_WIDTH * 2, 0.05, LANE.PIN_DECK_LENGTH),
      mat,
    );
    deck.position.set(0, LANE.SURFACE_Y - 0.025, LANE.PIN_DECK_Z - LANE.PIN_DECK_LENGTH / 2);
    this.group.add(deck);

    // Pin spots (dots where pins sit)
    const pinPositions = this.getPinPositions();
    const spotMat = new MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.3,
    });
    for (const pos of pinPositions) {
      const spot = new Mesh(new CylinderGeometry(0.04, 0.04, 0.005, 12), spotMat);
      spot.position.set(pos.x, LANE.SURFACE_Y + 0.005, pos.z);
      this.group.add(spot);
    }
  }

  private createBackstop() {
    const mat = new MeshStandardMaterial({
      color: 0x111130,
      roughness: 0.5,
      metalness: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    const backstop = new Mesh(
      new BoxGeometry(LANE.LANE_WIDTH + LANE.GUTTER_WIDTH * 2 + 0.4, LANE.BACKSTOP_HEIGHT, 0.2),
      mat,
    );
    backstop.position.set(0, LANE.BACKSTOP_HEIGHT / 2, LANE.BACKSTOP_Z);
    this.group.add(backstop);

    // Wireframe
    const edges = new EdgesGeometry(backstop.geometry);
    const edgeMat = new LineBasicMaterial({ color: this.primaryColor, transparent: true, opacity: 0.3 });
    const edgeLines = new LineSegments(edges, edgeMat);
    edgeLines.position.copy(backstop.position);
    this.group.add(edgeLines);
  }

  private createArrows() {
    // Standard bowling arrow markers at z = -7
    const arrowPositions = [-0.27, -0.135, -0.067, 0, 0.067, 0.135, 0.27];
    const arrowMat = new MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.5,
    });

    for (const x of arrowPositions) {
      // Triangle arrow pointing down the lane
      const verts = new Float32Array([
        x, LANE.SURFACE_Y + 0.005, LANE.ARROW_Z - 0.12,
        x - 0.03, LANE.SURFACE_Y + 0.005, LANE.ARROW_Z + 0.08,
        x + 0.03, LANE.SURFACE_Y + 0.005, LANE.ARROW_Z + 0.08,
      ]);
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
      const arrow = new Mesh(geo, arrowMat);
      this.group.add(arrow);
    }

    // Dots at approach
    const dotPositions = [-0.2, -0.1, 0, 0.1, 0.2];
    const dotMat = new MeshBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.4,
    });
    for (const z of [-0.5, -1.5]) {
      for (const x of dotPositions) {
        const dot = new Mesh(new CylinderGeometry(0.015, 0.015, 0.005, 8), dotMat);
        dot.position.set(x, LANE.SURFACE_Y + 0.005, z);
        this.group.add(dot);
      }
    }
  }

  private createBorderLights() {
    const glowMat = new MeshBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });

    // Running lights along lane edges
    for (let z = LANE.FOUL_LINE_Z; z > LANE.LANE_END_Z; z -= 1.5) {
      for (const side of [-1, 1]) {
        const x = side * (LANE.LANE_WIDTH / 2 + LANE.GUTTER_WIDTH + 0.05);
        const light = new Mesh(new BoxGeometry(0.04, 0.04, 0.04), glowMat);
        light.position.set(x, LANE.SURFACE_Y + 0.02, z);
        light.userData.pulseOffset = z * 0.5;
        this.group.add(light);
      }
    }
  }

  private createBallReturn() {
    // Ball return machine next to approach area
    const bodyMat = new MeshStandardMaterial({
      color: 0x111133,
      roughness: 0.3,
      metalness: 0.8,
    });
    const body = new Mesh(new BoxGeometry(0.5, 0.6, 0.5), bodyMat);
    body.position.set(LANE.BALL_RETURN_X, 0.3, LANE.BALL_RETURN_Z);
    this.group.add(body);

    // Wireframe
    const edges = new EdgesGeometry(body.geometry);
    const edgeMat = new LineBasicMaterial({ color: this.primaryColor, transparent: true, opacity: 0.5 });
    const edgeLines = new LineSegments(edges, edgeMat);
    edgeLines.position.copy(body.position);
    this.group.add(edgeLines);

    // Ball cradle (half-pipe)
    const cradleMat = new MeshStandardMaterial({
      color: 0x222244,
      roughness: 0.2,
      metalness: 0.9,
      side: DoubleSide,
    });
    const cradle = new Mesh(new CylinderGeometry(0.12, 0.12, 0.4, 16, 1, true, 0, Math.PI), cradleMat);
    cradle.rotation.z = Math.PI;
    cradle.rotation.y = Math.PI / 2;
    cradle.position.set(LANE.BALL_RETURN_X, 0.62, LANE.BALL_RETURN_Z);
    this.group.add(cradle);

    // Glowing ring around ball return
    const ringMat = new MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });
    const ring = new Mesh(new CylinderGeometry(0.15, 0.15, 0.02, 16), ringMat);
    ring.position.set(LANE.BALL_RETURN_X, 0.64, LANE.BALL_RETURN_Z);
    this.group.add(ring);
  }

  getPinPositions(): { x: number; z: number; row: number; index: number }[] {
    const positions: { x: number; z: number; row: number; index: number }[] = [];
    const sp = LANE.PIN_SPACING;
    const startZ = LANE.HEADPIN_Z;

    // Row 1: pin 1 (headpin)
    positions.push({ x: 0, z: startZ, row: 0, index: 0 });
    // Row 2: pins 2, 3
    positions.push({ x: -sp / 2, z: startZ - sp * 0.866, row: 1, index: 1 });
    positions.push({ x: sp / 2, z: startZ - sp * 0.866, row: 1, index: 2 });
    // Row 3: pins 4, 5, 6
    positions.push({ x: -sp, z: startZ - sp * 0.866 * 2, row: 2, index: 3 });
    positions.push({ x: 0, z: startZ - sp * 0.866 * 2, row: 2, index: 4 });
    positions.push({ x: sp, z: startZ - sp * 0.866 * 2, row: 2, index: 5 });
    // Row 4: pins 7, 8, 9, 10
    positions.push({ x: -sp * 1.5, z: startZ - sp * 0.866 * 3, row: 3, index: 6 });
    positions.push({ x: -sp / 2, z: startZ - sp * 0.866 * 3, row: 3, index: 7 });
    positions.push({ x: sp / 2, z: startZ - sp * 0.866 * 3, row: 3, index: 8 });
    positions.push({ x: sp * 1.5, z: startZ - sp * 0.866 * 3, row: 3, index: 9 });

    return positions;
  }

  update(time: number) {
    // Pulse border lights
    this.group.children.forEach(child => {
      if (child instanceof Mesh && child.userData.pulseOffset !== undefined) {
        const intensity = 0.3 + 0.3 * Math.sin(time * 2 + child.userData.pulseOffset);
        (child.material as MeshBasicMaterial).opacity = intensity;
      }
    });
  }
}
