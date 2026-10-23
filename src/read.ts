import * as THREE from 'three';

export const READ = { settle: 0.35, duration: 7, finish: 0.35, cooldown: 30, weight: 1 } as const;
export type ReadPhase = 'approach' | 'settle' | 'read' | 'finish';

// The reading clock owns the book pose and an optional doze that fades out with it.
export class ReadActivity {
  phase: ReadPhase = 'approach';
  elapsed = 0;
  pose = 0;
  readonly destination: THREE.Vector3;
  readonly heading: number;
  private finishFrom = 0;
  private dozeFrom = 0;
  private readonly dozes: boolean;
  constructor(reading: { position: THREE.Vector3; heading: number }, dozes: boolean) {
    this.destination = reading.position.clone(); this.heading = reading.heading;
    this.dozes = dozes;
  }
  get dozePose() {
    if (!this.dozes) return 0;
    if (this.phase === 'finish') return this.dozeFrom * this.pose;
    if (this.phase !== 'read') return 0;
    return THREE.MathUtils.smootherstep(this.elapsed, 2.1, 2.8) * (1 - THREE.MathUtils.smootherstep(this.elapsed, 4.2, 4.9));
  }
  arrive() { this.phase = 'settle'; this.elapsed = 0; }
  finish() {
    if (this.phase === 'finish') return;
    this.dozeFrom = this.dozePose; this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0;
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return false;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      this.pose = Math.min(1, this.elapsed / READ.settle);
      if (this.elapsed >= READ.settle) { this.phase = 'read'; this.elapsed = 0; }
    } else if (this.phase === 'read') {
      if (this.elapsed >= READ.duration) this.finish();
    } else {
      this.pose = this.finishFrom * (1 - Math.min(1, this.elapsed / READ.finish));
      if (this.elapsed >= READ.finish) return true;
    }
    return false;
  }
}
