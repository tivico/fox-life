export type LifePreference = 'reader' | 'gardener' | 'balanced';
export interface NeedsOptions { preference?: LifePreference; hunger?: number; energy?: number }
export interface NeedsSnapshot { hunger: number; energy: number; preference: LifePreference }
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const initial = (value: number | undefined, fallback: number) => Number.isFinite(value) ? clamp(value!) : fallback;

/** Gentle, foreground-only needs. They weight autonomous choices, never gate invitations. */
export class LifeNeeds {
  private hunger: number;
  private energy: number;
  readonly preference: LifePreference;
  constructor(options: NeedsOptions = {}) {
    this.hunger = initial(options.hunger, .22);
    this.energy = initial(options.energy, .82);
    this.preference = options.preference ?? 'balanced';
  }
  get snapshot(): NeedsSnapshot { return { hunger: this.hunger, energy: this.energy, preference: this.preference }; }
  get hint() {
    if (this.energy < .3) return '有點睏了，想找個舒服的地方';
    if (this.hunger > .65) return '肚子有點餓，惦記著小點心';
    return null;
  }
  update(dt: number, kind: string | null, phase: string | null, walking: boolean) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05);
    let food = .0015, rest = walking ? -.0016 : -.0009;
    if (kind === 'Food' && phase === 'eat') food = -.10;
    if (kind === 'Bed' && phase === 'sleep') rest = .10;
    if (phase === 'active') {
      if (kind === 'SofaRest' || kind === 'GardenRest') rest = .006;
      if (kind === 'WatchTV' || kind === 'WatchTVTogether') rest = .003;
      if (kind === 'Exercise') rest = -.004;
    }
    this.hunger = clamp(this.hunger + food * dt);
    this.energy = clamp(this.energy + rest * dt);
  }
  weight(kind: string) {
    const tired = 1 - this.energy;
    if (kind === 'Food') return .05 + 14 * this.hunger ** 3;
    if (kind === 'Bed') return .05 + 16 * tired ** 3;
    let weight = 1;
    if (this.preference === 'reader') {
      if (kind === 'Bookshelf') weight = 2.6;
      if (kind === 'Tea') weight = 1.4;
    } else if (this.preference === 'gardener') {
      if (kind === 'WaterPlants') weight = 2.6;
      if (kind === 'WatchButterflies') weight = 1.8;
      if (kind === 'GardenRest') weight = 1.5;
    }
    if (kind === 'SofaRest' || kind === 'GardenRest') weight *= 1 + 3 * tired ** 2;
    if (kind === 'Exercise') weight *= .2 + .8 * this.energy;
    return weight;
  }
  choose<T extends string>(eligible: readonly T[], walkWeight: number, random: number): T | undefined {
    const weights = eligible.map(kind => this.weight(kind));
    let choice = clamp(random) * (weights.reduce((sum, weight) => sum + weight, 0) + walkWeight);
    for (let i = 0; i < eligible.length; i++) {
      choice -= weights[i]!;
      if (choice < 0) return eligible[i];
    }
    return undefined;
  }
}
