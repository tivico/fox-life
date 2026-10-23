import type * as THREE from 'three';

export type DailyKind = 'Clean' | 'Play' | 'Stretch';
export type DailyPhase = 'approach' | 'settle' | 'carry' | 'active' | 'return' | 'finish';
export type CleanMode = 'pickup' | 'carry' | 'sweep' | 'stow';
export const CLEAN_STORAGE = {
  position: [-2.45, 0, 2.5], tool: [-2.09, 0, 2.7], heading: 0,
} as const;
export const DAILY = {
  settle: .4, finish: .45,
  Clean: { duration: 8.8, cooldown: 48, settle: .95, finish: .85 },
  Play: { duration: 7.6, cooldown: 38 },
  Stretch: { duration: 2.3, cooldown: 0 },
} as const;

interface LeisureSpots { clean: THREE.Vector3; play: THREE.Vector3; heading: number; storage: { position: THREE.Vector3; heading: number } }

// Stretching starts in place, play walks to the rug, and cleaning carries the broom
// from its rack to the rug and back again, even when it is interrupted.
export class DailyActivity {
  phase: DailyPhase;
  elapsed = 0;
  motionTime = 0;
  pose = 0;
  destination: THREE.Vector3 | null;
  readonly kind: DailyKind;
  private finishFrom = 0;
  private readonly spots: LeisureSpots;
  constructor(kind: DailyKind, spots: LeisureSpots) {
    this.kind = kind; this.spots = spots;
    this.phase = kind === 'Stretch' ? 'settle' : 'approach';
    this.destination = kind === 'Stretch' ? null : (kind === 'Clean' ? spots.storage.position : spots.play).clone();
  }
  get heading() { return this.kind === 'Clean' && this.phase !== 'carry' ? this.spots.storage.heading : this.spots.heading; }
  get cooldown() { return DAILY[this.kind].cooldown; }
  // Clean and play settle in their arrival Walk state; a stretch never walks.
  get state(): 'Walk' | DailyKind {
    if (this.kind === 'Stretch') return 'Stretch';
    return this.phase === 'active' || this.phase === 'finish' ? this.kind : 'Walk';
  }
  label() {
    const { kind, phase } = this;
    if (phase === 'carry') return 'Carry broom to rug';
    if (phase === 'return') return 'Return broom';
    if (phase === 'approach') return kind === 'Clean' ? 'Walk to broom' : 'Walk to play';
    if (phase === 'finish' && kind === 'Clean') return 'Putting broom back';
    if (phase === 'finish') return kind === 'Stretch' ? 'Finishing stretch' : 'Putting activity away';
    if (phase === 'settle') return kind === 'Clean' ? 'Getting broom' : kind === 'Play' ? 'Getting yarn' : 'Preparing stretch';
    return kind === 'Clean' ? 'Sweeping' : kind === 'Play' ? 'Playing with yarn' : 'Stretching';
  }
  needsSafeExit() { return this.pose > 0; }
  get cleanMode(): CleanMode | undefined {
    if (this.kind !== 'Clean') return undefined;
    return this.phase === 'settle' ? 'pickup' : this.phase === 'active' ? 'sweep' : this.phase === 'finish' ? 'stow' : 'carry';
  }
  arrive() {
    if (this.phase === 'carry') { this.phase = 'active'; this.elapsed = this.motionTime = 0; }
    else if (this.phase === 'return') { this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0; }
    else { this.phase = 'settle'; this.elapsed = 0; }
  }
  // 'move' means the broom is walking back to its rack before it is put away.
  finish(): 'move' | null {
    if (this.phase === 'finish') return null;
    if (this.kind === 'Clean' && this.phase !== 'settle') {
      if (this.phase === 'return') return null;
      this.phase = 'return'; this.elapsed = 0; this.destination = this.spots.storage.position.clone();
      return 'move';
    }
    this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0;
    return null;
  }
  update(dt: number): 'move' | 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || ['approach', 'carry', 'return'].includes(this.phase)) return null;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      const duration = this.kind === 'Clean' ? DAILY.Clean.settle : DAILY.settle;
      this.pose = Math.min(1, this.elapsed / duration);
      if (this.elapsed >= duration) {
        this.elapsed = 0;
        if (this.kind !== 'Clean') { this.phase = 'active'; return null; }
        this.phase = 'carry'; this.destination = this.spots.clean.clone();
        return 'move';
      }
    } else if (this.phase === 'active') {
      this.motionTime = Math.min(this.elapsed, DAILY[this.kind].duration);
      if (this.elapsed >= DAILY[this.kind].duration) return this.finish();
    } else {
      const duration = this.kind === 'Clean' ? DAILY.Clean.finish : DAILY.finish;
      this.pose = this.finishFrom * (1 - Math.min(1, this.elapsed / duration));
      if (this.elapsed >= duration) return 'done';
    }
    return null;
  }
}
