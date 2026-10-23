import * as THREE from 'three';

export const gardenActions = ['WaterPlants', 'WatchButterflies', 'GardenRest'] as const;
export type GardenAction = typeof gardenActions[number];
export const gardenLabels: Record<GardenAction, string> = { WaterPlants: '澆澆花', WatchButterflies: '看蝴蝶', GardenRest: '坐著吹風' };
export const gardenDurations: Record<GardenAction, number> = { WaterPlants: 9, WatchButterflies: 10, GardenRest: 12 };
export const CAN_PARK = new THREE.Vector3(6, .50, -1.59);
export const gardenStations = {
  WaterPlants: { position: new THREE.Vector3(6, 0, -1.25), heading: Math.PI },
  WatchButterflies: { position: new THREE.Vector3(7.4, 0, -.15), heading: Math.PI / 2 },
  GardenRest: { position: new THREE.Vector3(7.5, 0, .1), heading: Math.PI },
};
export function isGardenAction(value: unknown): value is GardenAction {
  return typeof value === 'string' && (gardenActions as readonly string[]).includes(value);
}
export interface GardenSnapshot { kind: GardenAction; phase: 'approach' | 'settle' | 'active' | 'finish'; elapsed: number; motionTime: number; pose: number }
export class GardenActivity implements GardenSnapshot {
  phase: GardenSnapshot['phase'] = 'approach'; elapsed = 0; motionTime = 0; pose = 0;
  readonly destination: THREE.Vector3; readonly heading: number;
  private finishFrom = 0;
  readonly kind: GardenAction;
  readonly cooldown = 65;
  constructor(kind: GardenAction) {
    this.kind = kind;
    this.destination = gardenStations[kind].position.clone(); this.heading = gardenStations[kind].heading;
  }
  get state(): 'Walk' | 'Living' { return this.phase === 'approach' ? 'Walk' : 'Living'; }
  label() { return `${this.kind}/${this.phase}`; }
  needsSafeExit() { return this.phase !== 'approach' && this.pose > 0; }
  arrive() { this.phase = 'settle'; this.elapsed = 0; }
  finish() {
    if (this.phase === 'finish') return;
    this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0;
  }
  update(dt: number): 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return null;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      this.pose = Math.min(1, this.elapsed / 1.5);
      if (this.pose === 1) { this.phase = 'active'; this.elapsed = 0; }
    } else if (this.phase === 'active') {
      this.motionTime = Math.min(this.elapsed, gardenDurations[this.kind]);
      if (this.elapsed >= gardenDurations[this.kind]) this.finish();
    } else {
      this.pose = this.finishFrom * Math.max(0, 1 - this.elapsed / 1.5);
      if (this.elapsed >= 1.5) return 'done';
    }
    return null;
  }
}
