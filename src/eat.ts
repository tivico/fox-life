import type * as THREE from 'three';

// Each eligible life action occupies one chooser slot; no unused weight setting.
export const EAT = { settle: 0.40, duration: 6, finish: 0.35, cooldown: 30 } as const;
export type EatPhase = 'approach' | 'settle' | 'eat' | 'finish';

// The meal clock owns settle, bites and a finish that starts from the current pose.
export class EatActivity {
  readonly kind = 'Food';
  readonly cooldown = EAT.cooldown;
  phase: EatPhase = 'approach';
  elapsed = 0;
  motionTime = 0;
  pose = 0;
  readonly destination: THREE.Vector3;
  readonly heading: number;
  private finishFrom = 0;
  constructor(dining: { position: THREE.Vector3; heading: number }) {
    this.destination = dining.position.clone(); this.heading = dining.heading;
  }
  // Settling at the table keeps the arrival Walk state; bites and finish read as Eat.
  get state(): 'Walk' | 'Eat' { return this.phase === 'eat' || this.phase === 'finish' ? 'Eat' : 'Walk'; }
  label() { return { approach: 'Walk to dining area', settle: 'Smelling food', eat: 'Eating', finish: 'Finishing meal' }[this.phase]; }
  needsSafeExit() { return this.pose > 0; }
  arrive() { this.phase = 'settle'; this.elapsed = 0; }
  finish() {
    if (this.phase === 'finish') return;
    this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0;
  }
  update(dt: number): 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return null;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      this.pose = Math.min(1, this.elapsed / EAT.settle);
      if (this.elapsed >= EAT.settle) { this.phase = 'eat'; this.elapsed = 0; }
    } else if (this.phase === 'eat') {
      this.motionTime = Math.min(this.elapsed, EAT.duration);
      if (this.elapsed >= EAT.duration) this.finish();
    } else {
      this.pose = this.finishFrom * (1 - Math.min(1, this.elapsed / EAT.finish));
      if (this.elapsed >= EAT.finish) return 'done';
    }
    return null;
  }
}
