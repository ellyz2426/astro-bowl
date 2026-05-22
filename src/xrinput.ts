/**
 * Astro Bowl VR — XR Controller Input
 * Grip to grab ball, trigger release to throw (velocity from controller tracking),
 * thumbstick navigation, A/B buttons for menus.
 */
import { World, Vector3, Quaternion } from '@iwsdk/core';

// InputComponent enum values (matching @iwsdk/core)
const InputComponent = {
  Trigger: 0,
  Squeeze: 1,
  Thumbstick: 2,
  A_Button: 3,
  B_Button: 4,
} as const;

interface ControllerTrackingFrame {
  position: Vector3;
  time: number;
}

export class XRInputHandler {
  private world: World;
  private isGrabbingBall: boolean = false;
  private controllerHistory: ControllerTrackingFrame[] = [];
  private maxHistoryFrames: number = 10;
  private thumbstickCooldown: number = 0;
  private thumbstickDeadzone: number = 0.3;
  private sensitivity: number = 1.0;

  // Callbacks
  onGrabBall: () => void = () => {};
  onReleaseBall: (velocity: Vector3) => void = () => {};
  onMenuUp: () => void = () => {};
  onMenuDown: () => void = () => {};
  onMenuLeft: () => void = () => {};
  onMenuRight: () => void = () => {};
  onConfirm: () => void = () => {};
  onBack: () => void = () => {};
  onPause: () => void = () => {};

  constructor(world: World) {
    this.world = world;
  }

  setSensitivity(val: number) {
    this.sensitivity = val;
  }

  update(dt: number) {
    const xrInput = (this.world.input as any)?.xr;
    if (!xrInput) return;

    const rightGamepad = xrInput.gamepads?.right;
    const leftGamepad = xrInput.gamepads?.left;
    if (!rightGamepad) return;

    // Track controller position for velocity calculation
    const gripSpace = (this.world as any).playerSpaceEntities?.gripSpaces?.right;
    if (gripSpace) {
      const pos = new Vector3();
      gripSpace.object3D.getWorldPosition(pos);
      this.controllerHistory.push({ position: pos, time: performance.now() / 1000 });
      if (this.controllerHistory.length > this.maxHistoryFrames) {
        this.controllerHistory.shift();
      }
    }

    // --- Squeeze (Grip) to grab ball ---
    const squeezePressed = rightGamepad.getButtonPressed?.(InputComponent.Squeeze)
      ?? rightGamepad.getButtonPressed?.(1);

    const squeezeDown = rightGamepad.getButtonDown?.(InputComponent.Squeeze)
      ?? rightGamepad.getButtonDown?.(1);

    const squeezeUp = rightGamepad.getButtonUp?.(InputComponent.Squeeze)
      ?? rightGamepad.getButtonUp?.(1);

    if (squeezeDown && !this.isGrabbingBall) {
      this.isGrabbingBall = true;
      this.controllerHistory = [];
      this.onGrabBall();
    }

    // --- Trigger to release/throw ball ---
    const triggerUp = rightGamepad.getButtonUp?.(InputComponent.Trigger)
      ?? rightGamepad.getButtonUp?.(0);

    const triggerDown = rightGamepad.getButtonDown?.(InputComponent.Trigger)
      ?? rightGamepad.getButtonDown?.(0);

    if (triggerUp && this.isGrabbingBall) {
      this.isGrabbingBall = false;
      const velocity = this.calculateThrowVelocity();
      this.onReleaseBall(velocity);
    }

    // Also release on grip release
    if (squeezeUp && this.isGrabbingBall) {
      this.isGrabbingBall = false;
      const velocity = this.calculateThrowVelocity();
      this.onReleaseBall(velocity);
    }

    // --- A Button: Confirm ---
    const aDown = rightGamepad.getButtonDown?.(InputComponent.A_Button)
      ?? rightGamepad.getButtonDown?.(3);
    if (aDown) {
      this.onConfirm();
    }

    // --- B Button: Back/Pause ---
    const bDown = rightGamepad.getButtonDown?.(InputComponent.B_Button)
      ?? rightGamepad.getButtonDown?.(4);
    if (bDown) {
      this.onBack();
    }

    // Left controller B button for pause
    if (leftGamepad) {
      const lbDown = leftGamepad.getButtonDown?.(InputComponent.B_Button)
        ?? leftGamepad.getButtonDown?.(4);
      if (lbDown) {
        this.onPause();
      }
    }

    // --- Thumbstick: Menu navigation ---
    this.thumbstickCooldown -= dt;
    if (this.thumbstickCooldown <= 0) {
      let axes: { x: number; y: number } | null = null;
      try {
        axes = rightGamepad.getAxesValues?.(InputComponent.Thumbstick);
      } catch {
        // Fallback: try to access raw axes
      }

      // Also try left thumbstick for navigation
      if (!axes && leftGamepad) {
        try {
          axes = leftGamepad.getAxesValues?.(InputComponent.Thumbstick);
        } catch {}
      }

      if (axes) {
        if (Math.abs(axes.y) > this.thumbstickDeadzone) {
          if (axes.y < -this.thumbstickDeadzone) {
            this.onMenuUp();
          } else if (axes.y > this.thumbstickDeadzone) {
            this.onMenuDown();
          }
          this.thumbstickCooldown = 0.25;
        }
        if (Math.abs(axes.x) > this.thumbstickDeadzone) {
          if (axes.x < -this.thumbstickDeadzone) {
            this.onMenuLeft();
          } else if (axes.x > this.thumbstickDeadzone) {
            this.onMenuRight();
          }
          this.thumbstickCooldown = 0.25;
        }
      }
    }
  }

  /**
   * Calculate throw velocity from controller tracking history.
   */
  private calculateThrowVelocity(): Vector3 {
    if (this.controllerHistory.length < 2) {
      return new Vector3(0, 0, -6); // Default forward throw
    }

    // Use the last few frames to calculate velocity
    const recent = this.controllerHistory.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDelta = last.time - first.time;

    if (timeDelta < 0.001) {
      return new Vector3(0, 0, -6);
    }

    const velocity = new Vector3(
      (last.position.x - first.position.x) / timeDelta,
      (last.position.y - first.position.y) / timeDelta,
      (last.position.z - first.position.z) / timeDelta,
    );

    // Scale velocity for game feel
    velocity.multiplyScalar(3.0 * this.sensitivity);

    // Clamp to reasonable range
    const speed = velocity.length();
    if (speed > 15) velocity.multiplyScalar(15 / speed);
    if (speed < 2) velocity.multiplyScalar(2 / speed);

    // Ensure ball goes forward (negative Z)
    if (velocity.z > -1) velocity.z = -Math.max(3, Math.abs(velocity.z));

    // Remove upward component (ball should stay on lane)
    velocity.y = 0;

    return velocity;
  }

  getControllerPosition(): Vector3 | null {
    const gripSpace = (this.world as any).playerSpaceEntities?.gripSpaces?.right;
    if (!gripSpace) return null;
    const pos = new Vector3();
    gripSpace.object3D.getWorldPosition(pos);
    return pos;
  }

  isGrabbing(): boolean {
    return this.isGrabbingBall;
  }
}
