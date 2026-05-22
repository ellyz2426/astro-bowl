/**
 * Astro Bowl VR — Browser Input Handler
 * Mouse click-drag aim, hold to charge power, release to throw.
 * WASD movement, keyboard shortcuts.
 */
import { World, Vector3 } from '@iwsdk/core';

export class BrowserInputHandler {
  private world: World;
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private dragCurrent: { x: number; y: number } = { x: 0, y: 0 };
  private powerCharging: boolean = false;
  private power: number = 0;
  private powerDir: number = 1;
  private aimX: number = 0; // -1 to 1, lateral aim

  // Callbacks
  onThrow: (velocity: Vector3) => void = () => {};
  onPowerChange: (power: number) => void = () => {};
  onAimChange: (aimX: number) => void = () => {};
  onConfirm: () => void = () => {};
  onBack: () => void = () => {};
  onPause: () => void = () => {};
  onMenuUp: () => void = () => {};
  onMenuDown: () => void = () => {};
  onStartCharge: () => void = () => {};

  private enabled: boolean = true;

  constructor(world: World, canvas: HTMLCanvasElement) {
    this.world = world;
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragCurrent = { ...this.dragStart };
      this.powerCharging = true;
      this.power = 0;
      this.onStartCharge();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.dragCurrent = { x: e.clientX, y: e.clientY };

      // Calculate aim direction from drag
      const dx = (this.dragCurrent.x - this.dragStart.x) / window.innerWidth;
      this.aimX = Math.max(-1, Math.min(1, dx * 3));
      this.onAimChange(this.aimX);
    });

    this.canvas.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.powerCharging = false;

      // Calculate throw velocity from power and aim
      const speed = 3 + this.power * 9; // 3-12 m/s
      const velocity = new Vector3(
        this.aimX * 2,   // lateral direction
        0,
        -speed,           // forward (negative Z)
      );
      this.onThrow(velocity);
      this.power = 0;
      this.aimX = 0;
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.onConfirm();
          break;
        case 'Escape':
          this.onPause();
          break;
        case 'Backspace':
          this.onBack();
          break;
        case 'ArrowUp':
        case 'w':
          this.onMenuUp();
          break;
        case 'ArrowDown':
        case 's':
          this.onMenuDown();
          break;
      }
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  update(dt: number) {
    // Power charging oscillates while mouse is held
    if (this.powerCharging) {
      this.power += this.powerDir * dt * 1.5;
      if (this.power >= 1) {
        this.power = 1;
        this.powerDir = -1;
      } else if (this.power <= 0) {
        this.power = 0;
        this.powerDir = 1;
      }
      this.onPowerChange(this.power);
    }
  }

  getPower(): number {
    return this.power;
  }

  getAimX(): number {
    return this.aimX;
  }

  isDragActive(): boolean {
    return this.isDragging;
  }
}
