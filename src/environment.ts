/**
 * Astro Bowl VR — Environment
 * Holodeck arena: neon grid floor, fog, ambient lights, ceiling grid, walls.
 */
import {
  Group, Mesh, PlaneGeometry, BoxGeometry, SphereGeometry,
  MeshBasicMaterial, MeshStandardMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, Color, Fog, AmbientLight,
  DirectionalLight, PointLight, Vector3, DoubleSide,
  AdditiveBlending, CylinderGeometry, Float32BufferAttribute,
  BufferGeometry, TorusGeometry, RingGeometry,
} from '@iwsdk/core';

export interface ThemeColors {
  primary: Color;
  secondary: Color;
  accent: Color;
  fog: Color;
  ambient: Color;
  grid: Color;
  name: string;
}

export const THEMES: Record<string, ThemeColors> = {
  neon_circuit: {
    name: 'Neon Circuit',
    primary: new Color(0x00ffff),
    secondary: new Color(0xff00ff),
    accent: new Color(0xffff00),
    fog: new Color(0x000a14),
    ambient: new Color(0x001122),
    grid: new Color(0x00ffff),
  },
  starfield: {
    name: 'Starfield',
    primary: new Color(0x4488ff),
    secondary: new Color(0xffffff),
    accent: new Color(0x88ccff),
    fog: new Color(0x000008),
    ambient: new Color(0x000811),
    grid: new Color(0x2244aa),
  },
  quantum_grid: {
    name: 'Quantum Grid',
    primary: new Color(0x00ff88),
    secondary: new Color(0xaa00ff),
    accent: new Color(0xff4400),
    fog: new Color(0x000a04),
    ambient: new Color(0x001108),
    grid: new Color(0x00ff88),
  },
};

export class EnvironmentBuilder {
  group: Group;
  theme: ThemeColors;
  private particles: Mesh[] = [];
  private gridFloor: LineSegments;
  private ceilingGrid: LineSegments;
  private wallPanels: Mesh[] = [];
  private lights: PointLight[] = [];

  constructor(theme: string = 'neon_circuit') {
    this.group = new Group();
    this.theme = THEMES[theme] || THEMES.neon_circuit;
    this.buildEnvironment();
  }

  private buildEnvironment() {
    // Grid floor
    this.gridFloor = this.createGrid(60, 80, 1, this.theme.grid, 0.3);
    this.gridFloor.position.y = -0.01;
    this.gridFloor.rotation.x = -Math.PI / 2;
    this.group.add(this.gridFloor);

    // Ceiling grid
    this.ceilingGrid = this.createGrid(60, 80, 2, this.theme.grid, 0.15);
    this.ceilingGrid.position.y = 8;
    this.ceilingGrid.rotation.x = -Math.PI / 2;
    this.group.add(this.ceilingGrid);

    // Side walls (translucent panels)
    this.createWalls();

    // Ambient lights
    const ambient = new AmbientLight(this.theme.ambient, 0.4);
    this.group.add(ambient);

    const dir = new DirectionalLight(0xffffff, 0.3);
    dir.position.set(5, 10, 5);
    this.group.add(dir);

    // Neon accent lights along the lane
    for (let z = 0; z > -20; z -= 4) {
      const lightLeft = new PointLight(this.theme.primary.getHex(), 0.6, 12);
      lightLeft.position.set(-5, 3, z);
      this.group.add(lightLeft);
      this.lights.push(lightLeft);

      const lightRight = new PointLight(this.theme.secondary.getHex(), 0.6, 12);
      lightRight.position.set(5, 3, z);
      this.group.add(lightRight);
      this.lights.push(lightRight);
    }

    // Floating ambient particles
    this.createFloatingParticles();

    // Holographic decorative elements
    this.createDecorations();
  }

  private createGrid(width: number, depth: number, spacing: number, color: Color, opacity: number): LineSegments {
    const points: number[] = [];
    const halfW = width / 2;
    const halfD = depth / 2;

    // Lines along X
    for (let z = -halfD; z <= halfD; z += spacing) {
      points.push(-halfW, 0, z, halfW, 0, z);
    }
    // Lines along Z
    for (let x = -halfW; x <= halfW; x += spacing) {
      points.push(x, 0, -halfD, x, 0, halfD);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(points, 3));
    const mat = new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
    return new LineSegments(geo, mat);
  }

  private createWalls() {
    const wallMat = new MeshBasicMaterial({
      color: this.theme.primary,
      transparent: true,
      opacity: 0.05,
      side: DoubleSide,
    });

    // Left wall
    const leftWall = new Mesh(new PlaneGeometry(80, 8), wallMat);
    leftWall.position.set(-12, 4, -20);
    leftWall.rotation.y = Math.PI / 2;
    this.group.add(leftWall);
    this.wallPanels.push(leftWall);

    // Right wall
    const rightWall = new Mesh(new PlaneGeometry(80, 8), wallMat.clone());
    rightWall.position.set(12, 4, -20);
    rightWall.rotation.y = -Math.PI / 2;
    this.group.add(rightWall);
    this.wallPanels.push(rightWall);

    // Wall edge lines
    const edgeMat = new LineBasicMaterial({ color: this.theme.primary, transparent: true, opacity: 0.4 });
    for (const wall of this.wallPanels) {
      const edges = new EdgesGeometry(wall.geometry);
      const edgeLines = new LineSegments(edges, edgeMat);
      edgeLines.position.copy(wall.position);
      edgeLines.rotation.copy(wall.rotation);
      this.group.add(edgeLines);
    }
  }

  private createFloatingParticles() {
    const colors = [this.theme.primary, this.theme.secondary, this.theme.accent];
    for (let i = 0; i < 40; i++) {
      const size = 0.03 + Math.random() * 0.06;
      const geo = new SphereGeometry(size, 6, 6);
      const mat = new MeshBasicMaterial({
        color: colors[i % 3],
        transparent: true,
        opacity: 0.3 + Math.random() * 0.4,
        blending: AdditiveBlending,
      });
      const particle = new Mesh(geo, mat);
      particle.position.set(
        (Math.random() - 0.5) * 20,
        1 + Math.random() * 6,
        -Math.random() * 25,
      );
      particle.userData.floatSpeed = 0.3 + Math.random() * 0.5;
      particle.userData.floatOffset = Math.random() * Math.PI * 2;
      particle.userData.driftX = (Math.random() - 0.5) * 0.2;
      this.group.add(particle);
      this.particles.push(particle);
    }
  }

  private createDecorations() {
    // Floating holographic shapes
    const shapes = [
      new BoxGeometry(0.4, 0.4, 0.4),
      new SphereGeometry(0.25, 8, 8),
      new TorusGeometry(0.3, 0.08, 8, 16),
      new CylinderGeometry(0.2, 0.2, 0.5, 8),
    ];

    for (let i = 0; i < 12; i++) {
      const geo = shapes[i % shapes.length];
      const edgeGeo = new EdgesGeometry(geo);
      const mat = new LineBasicMaterial({
        color: i % 2 === 0 ? this.theme.primary : this.theme.secondary,
        transparent: true,
        opacity: 0.2 + Math.random() * 0.3,
      });
      const wireShape = new LineSegments(edgeGeo, mat);
      const side = i % 2 === 0 ? -1 : 1;
      wireShape.position.set(
        side * (6 + Math.random() * 4),
        2 + Math.random() * 4,
        -Math.random() * 20,
      );
      wireShape.userData.rotSpeed = (Math.random() - 0.5) * 0.5;
      wireShape.userData.floatSpeed = 0.2 + Math.random() * 0.3;
      wireShape.userData.floatOffset = Math.random() * Math.PI * 2;
      this.group.add(wireShape);
    }
  }

  applyTheme(themeName: string) {
    const theme = THEMES[themeName];
    if (!theme) return;
    this.theme = theme;

    // Update grid colors
    (this.gridFloor.material as LineBasicMaterial).color.copy(theme.grid);
    (this.ceilingGrid.material as LineBasicMaterial).color.copy(theme.grid);

    // Update wall colors
    for (const wall of this.wallPanels) {
      (wall.material as MeshBasicMaterial).color.copy(theme.primary);
    }

    // Update lights
    const lightColors = [theme.primary, theme.secondary];
    this.lights.forEach((light, i) => {
      light.color.copy(lightColors[i % 2]);
    });
  }

  update(time: number) {
    // Animate floating particles
    for (const p of this.particles) {
      const t = time * p.userData.floatSpeed + p.userData.floatOffset;
      p.position.y += Math.sin(t) * 0.002;
      p.position.x += p.userData.driftX * 0.001;
    }

    // Animate decorative wireframes
    this.group.children.forEach(child => {
      if (child instanceof LineSegments && child.userData.rotSpeed) {
        child.rotation.x += child.userData.rotSpeed * 0.01;
        child.rotation.y += child.userData.rotSpeed * 0.015;
        const ft = time * child.userData.floatSpeed + child.userData.floatOffset;
        child.position.y += Math.sin(ft) * 0.001;
      }
    });
  }
}
