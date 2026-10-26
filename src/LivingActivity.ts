import * as THREE from 'three';

export const livingActions = ['WatchTV', 'SofaRest', 'Tea', 'Exercise', 'Music', 'TidySofa'] as const;
export type LivingAction = typeof livingActions[number];
export type LivingPhase = 'approach' | 'pickup' | 'carry' | 'settle' | 'active' | 'finish' | 'return' | 'putdown';
export const livingLabels: Record<LivingAction, string> = {
  WatchTV: '看電視', SofaRest: '窩沙發', Tea: '喝杯茶', Exercise: '做運動', Music: '聽音樂', TidySofa: '整理沙發',
};
export const livingDurations: Record<LivingAction, number> = { WatchTV: 14, SofaRest: 12, Tea: 9, Exercise: 10.8, Music: 12, TidySofa: 8.2 };
export const CUP_PARK = new THREE.Vector3(2.68, .83, 7.3);
export const CUP_APPROACH = new THREE.Vector3(2.0, 0, 7.3);
export const SOFA_APPROACH = new THREE.Vector3(-1.65, 0, 6.4);
export const SOFA_PAIR_GAP = 1.2;
export function isLivingAction(value: unknown): value is LivingAction {
  return typeof value === 'string' && (livingActions as readonly string[]).includes(value);
}
export interface LivingSnapshot {
  kind: LivingAction; phase: LivingPhase; elapsed: number; motionTime: number; pose: number; cupHold: number;
  /** Only the lead fox holds the shared remote during a pair. */
  remote?: boolean;
  /** Partner-facing side; the paired fox's tail curls to the opposite side. */
  tailSide?: number;
}

// Action clocks own props through pickup, carrying and return, including safe interruption.
export class LivingActivity implements LivingSnapshot {
  readonly remote = true;
  phase: LivingPhase = 'approach';
  elapsed = 0;
  motionTime = 0;
  pose = 0;
  cupHold = 0;
  destination: THREE.Vector3;
  readonly heading: number;
  private finishFrom = 0;
  private finishAfterPickup = false;
  readonly kind: LivingAction;
  readonly cooldown = 45;
  constructor(kind: LivingAction) {
    this.kind = kind;
    this.destination = kind === 'Tea' ? CUP_APPROACH.clone() : kind === 'Exercise' ? new THREE.Vector3(.35, 0, 6.35)
      : kind === 'TidySofa' ? new THREE.Vector3(-1.65, 0, 7.15) : SOFA_APPROACH.clone();
    this.heading = kind === 'TidySofa' ? -Math.PI / 2 : kind === 'Exercise' ? .25 : Math.PI / 2;
  }
  // A cup already on its way back keeps walking toward its table.
  get state(): 'Walk' | 'Living' { return ['approach', 'carry', 'return'].includes(this.phase) ? 'Walk' : 'Living'; }
  label() { return `${this.kind}/${this.phase}`; }
  needsSafeExit() { return this.phase !== 'approach'; }
  arrive() {
    this.phase = this.phase === 'return' ? 'putdown' : this.kind === 'Tea' && this.phase === 'approach' ? 'pickup' : 'settle';
    this.elapsed = 0;
  }
  finish() {
    if (this.phase === 'finish' || this.phase === 'return' || this.phase === 'putdown') return;
    if (this.phase === 'pickup') { this.finishAfterPickup = true; return; }
    this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0;
  }
  update(dt: number): 'move' | 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || ['approach', 'carry', 'return'].includes(this.phase)) return null;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'pickup') {
      this.cupHold = THREE.MathUtils.smootherstep(this.elapsed, .3, .95);
      if (this.elapsed >= 1.1) {
        this.elapsed = 0;
        if (this.finishAfterPickup) this.phase = 'putdown';
        else { this.phase = 'carry'; this.destination.copy(SOFA_APPROACH); return 'move'; }
      }
    } else if (this.phase === 'settle') {
      this.pose = Math.min(1, this.elapsed / 1.35);
      if (this.elapsed >= 1.35) { this.phase = 'active'; this.pose = 1; this.elapsed = 0; }
    } else if (this.phase === 'active') {
      this.motionTime = Math.min(this.elapsed, livingDurations[this.kind]);
      if (this.elapsed >= livingDurations[this.kind]) this.finish();
    } else if (this.phase === 'finish') {
      this.pose = this.finishFrom * Math.max(0, 1 - this.elapsed / 1.35);
      if (this.elapsed >= 1.35) {
        this.pose = 0;
        if (this.kind !== 'Tea') return 'done';
        this.phase = 'return'; this.elapsed = 0; this.destination.copy(CUP_APPROACH); return 'move';
      }
    } else if (this.phase === 'putdown') {
      this.cupHold = 1 - THREE.MathUtils.smootherstep(this.elapsed, .3, .95);
      if (this.elapsed >= 1.1) return 'done';
    }
    return null;
  }
}
