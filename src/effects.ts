/**
 * Astro Bowl VR — Visual Effects
 * Strike/spare celebrations, particle explosions, text popups,
 * camera shake, slow-motion, ball trail effects.
 */
import {
  Group, Mesh, SphereGeometry, BoxGeometry,
  MeshBasicMaterial, Color, Vector3, AdditiveBlending,
} from '@iwsdk/core';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
}

export class EffectsManager {
  group: Group;
  private particles: Particle[] = [];
  private cameraShakeIntensity: number = 0;
  private cameraShakeDecay: number = 0.92;
  private slowMotionActive: boolean = false;
  private slowMotionTimer: number = 0;
  private slowMotionDuration: number = 0;
  timeScale: number = 1;

  constructor() {
    this.group = new Group();
  }

  /**
   * Spawn a burst of particles at a position.
   */
  spawnParticleBurst(
    position: Vector3,
    count: number,
    color: Color,
    speed: number = 5,
    lifetime: number = 1.5,
  ) {
    for (let i = 0; i < count; i++) {
      const size = 0.02 + Math.random() * 0.05;
      const geo = Math.random() > 0.5
        ? new SphereGeometry(size, 6, 6)
        : new BoxGeometry(size, size, size);
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.copy(position);

      const velocity = new Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 1,
        (Math.random() - 0.5) * speed,
      );

      const particle: Particle = {
        mesh,
        velocity,
        life: lifetime + Math.random() * 0.5,
        maxLife: lifetime + Math.random() * 0.5,
      };

      this.particles.push(particle);
      this.group.add(mesh);
    }
  }

  /**
   * Strike celebration — big particle explosion + camera shake.
   */
  playStrikeCelebration(pinPosition: Vector3) {
    const colors = [
      new Color(0xff4444),
      new Color(0x00ffff),
      new Color(0xffff00),
      new Color(0xff00ff),
    ];

    // Big central burst
    for (const color of colors) {
      this.spawnParticleBurst(pinPosition, 15, color, 8, 2);
    }

    // Ring of particles
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const pos = pinPosition.clone().add(new Vector3(
        Math.cos(angle) * 0.5,
        0.5,
        Math.sin(angle) * 0.5,
      ));
      this.spawnParticleBurst(pos, 3, new Color(0x00ffff), 4, 1.5);
    }

    this.triggerCameraShake(0.15);
  }

  /**
   * Spare celebration — more subtle particles.
   */
  playSpareCelebration(pinPosition: Vector3) {
    this.spawnParticleBurst(pinPosition, 20, new Color(0xffaa00), 5, 1.5);
    this.spawnParticleBurst(pinPosition, 10, new Color(0x00ffff), 3, 1.2);
    this.triggerCameraShake(0.06);
  }

  /**
   * Gutter visual.
   */
  playGutterEffect(ballPosition: Vector3) {
    this.spawnParticleBurst(ballPosition, 8, new Color(0x666666), 2, 0.8);
  }

  /**
   * Turkey celebration (3 strikes).
   */
  playTurkeyCelebration(position: Vector3) {
    this.playStrikeCelebration(position);
    // Extra gold particles
    setTimeout(() => {
      this.spawnParticleBurst(position, 30, new Color(0xffd700), 10, 2.5);
      this.triggerCameraShake(0.25);
    }, 200);
  }

  /**
   * Pin hit impact.
   */
  playPinHitEffect(position: Vector3, intensity: number) {
    const count = Math.ceil(intensity * 5);
    this.spawnParticleBurst(position, count, new Color(0xffffff), intensity * 3, 0.6);
  }

  /**
   * Achievement unlock effect.
   */
  playAchievementEffect() {
    const center = new Vector3(0, 2, -3);
    this.spawnParticleBurst(center, 30, new Color(0xffd700), 6, 2);
    this.spawnParticleBurst(center, 20, new Color(0xffaa00), 4, 1.5);
  }

  /**
   * Camera shake.
   */
  triggerCameraShake(intensity: number) {
    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, intensity);
  }

  getCameraShakeOffset(): Vector3 {
    if (this.cameraShakeIntensity < 0.001) return new Vector3();
    return new Vector3(
      (Math.random() - 0.5) * this.cameraShakeIntensity,
      (Math.random() - 0.5) * this.cameraShakeIntensity * 0.5,
      (Math.random() - 0.5) * this.cameraShakeIntensity * 0.3,
    );
  }

  /**
   * Start slow motion.
   */
  startSlowMotion(duration: number, scale: number = 0.3) {
    this.slowMotionActive = true;
    this.slowMotionTimer = 0;
    this.slowMotionDuration = duration;
    this.timeScale = scale;
  }

  /**
   * Update effects.
   */
  update(dt: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as MeshBasicMaterial).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Gravity
      p.velocity.y -= 9.81 * dt * 0.3;

      // Update position
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = lifeRatio * 0.8;

      // Scale down
      const scale = 0.3 + lifeRatio * 0.7;
      p.mesh.scale.setScalar(scale);

      // Floor bounce
      if (p.mesh.position.y < 0) {
        p.mesh.position.y = 0;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
      }
    }

    // Camera shake decay
    this.cameraShakeIntensity *= this.cameraShakeDecay;
    if (this.cameraShakeIntensity < 0.001) this.cameraShakeIntensity = 0;

    // Slow motion
    if (this.slowMotionActive) {
      this.slowMotionTimer += dt;
      if (this.slowMotionTimer >= this.slowMotionDuration) {
        this.slowMotionActive = false;
        this.timeScale = 1;
      } else {
        // Ease back to normal near end
        const progress = this.slowMotionTimer / this.slowMotionDuration;
        if (progress > 0.7) {
          this.timeScale = 0.3 + (progress - 0.7) / 0.3 * 0.7;
        }
      }
    }
  }

  cleanup() {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as MeshBasicMaterial).dispose();
    }
    this.particles = [];
  }
}
