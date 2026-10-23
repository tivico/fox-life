import * as THREE from 'three';

/** Sleep-only timing and pose contract; no registry or future action configuration. */
export const SLEEP = { settle: 0.65, duration: 8, wake: 0.75, cooldown: 45, walkWeight: 3, weight: 1 } as const;
export type SleepPhase = 'approach' | 'settle' | 'sleep' | 'wake';

// The bed clock owns settle, sleep and a wake that eases out from the current pose.
export class SleepActivity {
  phase: SleepPhase = 'approach';
  elapsed = 0;
  pose = 0;
  readonly destination: THREE.Vector3;
  readonly heading: number;
  private wakeFrom = 0;
  constructor(bed: { position: THREE.Vector3; heading: number }) {
    this.destination = bed.position.clone(); this.heading = bed.heading;
  }
  arrive() { this.phase = 'settle'; this.elapsed = 0; }
  // Waking is the finish of a sleep, whether it ran its full course or was interrupted.
  finish() {
    if (this.phase === 'wake') return;
    this.wakeFrom = this.pose; this.phase = 'wake'; this.elapsed = 0;
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return false;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      this.pose = THREE.MathUtils.clamp(this.elapsed / SLEEP.settle, 0, 1);
      if (this.elapsed >= SLEEP.settle) { this.phase = 'sleep'; this.elapsed = 0; }
    } else if (this.phase === 'sleep') {
      if (this.elapsed >= SLEEP.duration) this.finish();
    } else {
      this.pose = this.wakeFrom * (1 - THREE.MathUtils.clamp(this.elapsed / SLEEP.wake, 0, 1));
      if (this.elapsed >= SLEEP.wake) return true;
    }
    return false;
  }
}
