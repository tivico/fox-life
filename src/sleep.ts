import * as THREE from 'three';

/** Sleep-only timing and pose contract; no registry or future action configuration. */
export const SLEEP = { settle: 0.65, duration: 8, wake: 0.75, cooldown: 45, walkWeight: 3, weight: 1 } as const;
export type SleepPhase = 'approach' | 'settle' | 'sleep' | 'wake';

// The bed clock owns settle, sleep and a wake that eases out from the current pose.
export class SleepActivity {
  readonly kind = 'Bed';
  readonly cooldown = SLEEP.cooldown;
  phase: SleepPhase = 'approach';
  elapsed = 0;
  pose = 0;
  readonly destination: THREE.Vector3;
  readonly heading: number;
  private wakeFrom = 0;
  constructor(bed: { position: THREE.Vector3; heading: number }) {
    this.destination = bed.position.clone(); this.heading = bed.heading;
  }
  // Settling into bed keeps the arrival Walk state; sleeping and waking read as Sleep.
  get state(): 'Walk' | 'Sleep' { return this.phase === 'sleep' || this.phase === 'wake' ? 'Sleep' : 'Walk'; }
  // The wake label names where an interrupting invitation is taking the fox next.
  label(next: string | null) {
    if (this.phase === 'wake') return next === 'Window' ? 'Waking up for window' : next === 'Bookshelf' ? 'Waking up for reading' : 'Waking up';
    return { approach: 'Walk to bed', settle: 'Settle into bed', sleep: 'Sleeping' }[this.phase];
  }
  needsSafeExit() { return this.pose > 0; }
  arrive() { this.phase = 'settle'; this.elapsed = 0; }
  // Waking is the finish of a sleep, whether it ran its full course or was interrupted.
  finish() {
    if (this.phase === 'wake') return;
    this.wakeFrom = this.pose; this.phase = 'wake'; this.elapsed = 0;
  }
  update(dt: number): 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return null;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      this.pose = THREE.MathUtils.clamp(this.elapsed / SLEEP.settle, 0, 1);
      if (this.elapsed >= SLEEP.settle) { this.phase = 'sleep'; this.elapsed = 0; }
    } else if (this.phase === 'sleep') {
      if (this.elapsed >= SLEEP.duration) this.finish();
    } else {
      this.pose = this.wakeFrom * (1 - THREE.MathUtils.clamp(this.elapsed / SLEEP.wake, 0, 1));
      if (this.elapsed >= SLEEP.wake) return 'done';
    }
    return null;
  }
}
