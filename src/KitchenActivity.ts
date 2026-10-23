import * as THREE from 'three';

export const kitchenActions = ['ChopVegetables', 'CookSoup', 'BakeCookies'] as const;
export type KitchenAction = typeof kitchenActions[number];
export const kitchenLabels: Record<KitchenAction, string> = { ChopVegetables: '切切蔬菜', CookSoup: '煮鍋暖湯', BakeCookies: '烤餅乾' };
export const kitchenDurations: Record<KitchenAction, number> = { ChopVegetables: 9, CookSoup: 11, BakeCookies: 13 };
export const kitchenStations = {
  ChopVegetables: { position: new THREE.Vector3(5.25, 0, 4.88), heading: Math.PI },
  CookSoup: { position: new THREE.Vector3(6.65, 0, 4.88), heading: Math.PI },
  BakeCookies: { position: new THREE.Vector3(8.05, 0, 4.88), heading: Math.PI },
};
export function isKitchenAction(value: unknown): value is KitchenAction {
  return typeof value === 'string' && (kitchenActions as readonly string[]).includes(value);
}
export interface KitchenSnapshot { kind: KitchenAction; phase: 'approach' | 'settle' | 'active' | 'finish' | 'retreat'; elapsed: number; motionTime: number; pose: number }
export class KitchenActivity implements KitchenSnapshot {
  phase: KitchenSnapshot['phase'] = 'approach'; elapsed = 0; motionTime = 0; pose = 0;
  readonly kind: KitchenAction; readonly destination: THREE.Vector3; readonly heading: number;
  readonly cooldown = 70;
  private finishFrom = 0;
  constructor(kind: KitchenAction) {
    this.kind = kind; this.destination = kitchenStations[kind].position.clone(); this.heading = kitchenStations[kind].heading;
  }
  get state(): 'Walk' | 'Living' { return this.phase === 'approach' ? 'Walk' : 'Living'; }
  label() { return `${this.kind}/${this.phase}`; }
  // An approach that already reached the counter area finishes in place as well.
  needsSafeExit(position: THREE.Vector3) { return this.phase !== 'approach' || position.x > 4.2 && position.z < 5.65; }
  arrive() { this.phase = 'settle'; this.elapsed = 0; }
  finish() { if (this.phase === 'finish' || this.phase === 'retreat') return; this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0; }
  // The retreat steps back from the counter by itself; returns the distance moved.
  stepBack(position: THREE.Vector3, dt: number) {
    if (this.phase !== 'retreat') return 0;
    const moved = Math.min(.7 * dt, Math.max(0, 5.65 - position.z));
    position.z += moved;
    return moved;
  }
  update(dt: number): 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return null;
    this.elapsed += Math.min(dt, .05);
    if (this.phase === 'settle') {
      this.pose = Math.min(1, this.elapsed / 1.4);
      if (this.pose === 1) { this.phase = 'active'; this.elapsed = 0; }
    } else if (this.phase === 'active') {
      this.motionTime = Math.min(this.elapsed, kitchenDurations[this.kind]);
      if (this.elapsed >= kitchenDurations[this.kind]) this.finish();
    } else if (this.phase === 'finish') {
      this.pose = this.finishFrom * Math.max(0, 1 - this.elapsed / 1.4);
      if (this.elapsed >= 1.4) { this.phase = 'retreat'; this.elapsed = 0; }
    } else if (this.elapsed >= 1.2) return 'done';
    return null;
  }
}

// The paws and visible utensils share world-space targets and the same action clock.
export function kitchenMotion(activity: KitchenSnapshot | null, kind: KitchenAction) {
  const matching = activity?.kind === kind;
  const p = matching ? THREE.MathUtils.smootherstep(activity.pose, 0, 1) : 0;
  const t = matching ? activity.motionTime : 0;
  const x = kitchenStations[kind].position.x;
  let lift = 0;
  for (const start of [.7, 2.0, 3.3, 4.6, 5.9, 7.2]) {
    const u = t - start;
    lift += THREE.MathUtils.smootherstep(u, 0, .35) * (1 - THREE.MathUtils.smootherstep(u, .45, .75));
  }
  const chopping = new THREE.Vector3(x - .17, .55 + (.015 + .030 * lift) * p, 4.65);
  const stirring = new THREE.Vector3(x - .23 + Math.sin(t * 1.5) * .025 * p, .64 + .010 * p, 4.65 + (Math.cos(t * 1.5) - 1) * .025 * p);
  const press = THREE.MathUtils.smootherstep(t, .2, .6) * (1 - THREE.MathUtils.smootherstep(t, 1.2, 1.6));
  const right = kind === 'ChopVegetables' ? chopping : kind === 'CookSoup' ? stirring : new THREE.Vector3(x - .18, .58, 4.66 - .025 * press);
  const left = new THREE.Vector3(x + .20, .54, 4.68);
  const armAmount = kind === 'BakeCookies' ? p * (1 - THREE.MathUtils.smootherstep(t, 1.7, 2.5)) : p;
  return { p, t, right, left, armAmount };
}
