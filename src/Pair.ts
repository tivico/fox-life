import * as THREE from 'three';
import type { Character } from './Character.ts';
import { homeRooms, roomAt } from './HomeNavigation.ts';
import { SOFA_APPROACH, SOFA_PAIR_GAP, type LivingSnapshot } from './LivingActivity.ts';

export const pairActions = ['Boop', 'GazeTogether', 'WatchTVTogether'] as const;
export type PairAction = typeof pairActions[number];
export const pairLabels: Record<PairAction, string> = { Boop: '碰碰鼻子', GazeTogether: '一起看窗外', WatchTVTogether: '一起看電視' };
export function isPairAction(value: unknown): value is PairAction {
  return typeof value === 'string' && (pairActions as readonly string[]).includes(value);
}
/** Pair-only timing and spacing; two foxes share one clock once both have arrived. */
export const PAIR = {
  Boop: { duration: 3.2, gap: .84 },
  GazeTogether: { duration: 7, gap: .7 },
  WatchTVTogether: { duration: 16, gap: SOFA_PAIR_GAP },
  settle: .5, finish: .6,
  // How long the first fox waits at its spot for the other, including the other's safe exit.
  patience: 30,
  // Autonomous pairs: a chance per second while both are free in one room, then a long rest.
  chance: .4, rest: 60,
} as const;
/** The nose tip in head space, shared by the visual and the standing muzzle measurement. */
export const NOSE = new THREE.Vector3(0, -.075, .46);
/** The middle of the paw in right-arm space (the left arm mirrors x), shared the same way for holding hands. */
export const PAW = new THREE.Vector3(.05, -.33, 0);
export interface Muzzle { reach: number; height: number }
export interface Shoulder { position: THREE.Vector3; arm: number }
export type PairPhase = 'approach' | 'wait' | 'settle' | 'active' | 'finish';
export interface PairSnapshot {
  kind: PairAction; phase: PairPhase; elapsed: number; motionTime: number; pose: number;
  lead: boolean; partner: string; who: string;
}
/** For a boop, each fox covers half the gap between the two noses and meets the other at their mid height.
 *  At the window, `hand` is where the two inner paws meet, in this fox's own frame. */
export interface PairPose {
  kind: PairAction; pose: number; motionTime: number; side: number; reach: number; rise: number; lateral: number;
  hand: THREE.Vector3 | null;
}

// A fox's own frame: x to its side, y up, z straight ahead, measured from its feet in world units.
function toFrame(fox: Character, point: THREE.Vector3) {
  const h = fox.root.rotation.y, offset = point.clone().sub(fox.root.position);
  return new THREE.Vector3(offset.x * Math.cos(h) - offset.z * Math.sin(h), offset.y, offset.x * Math.sin(h) + offset.z * Math.cos(h));
}
function fromFrame(fox: Character, local: THREE.Vector3) {
  const h = fox.root.rotation.y;
  return new THREE.Vector3(local.x * Math.cos(h) + local.z * Math.sin(h), local.y, local.z * Math.cos(h) - local.x * Math.sin(h))
    .add(fox.root.position);
}
// The shoulder on the side facing the other fox, in its own frame.
function innerShoulder(fox: Character, toward: THREE.Vector3) {
  const { position } = fox.shoulder;
  return position.clone().setX((Math.sign(toFrame(fox, toward).x) || 1) * Math.abs(position.x));
}

// Both foxes hold the same plan: where each one stands, who has arrived, and whether the pair is over.
export class PairPlan {
  readonly kind: PairAction;
  readonly members: readonly [Character, Character];
  readonly spots: readonly [THREE.Vector3, THREE.Vector3];
  readonly headings: readonly [number, number];
  readonly arrived = new Set<number>();
  private readonly departed = new Set<number>();
  go = false;
  over = false;
  constructor(kind: PairAction, lead: Character, partner: Character) {
    this.kind = kind; this.members = [lead, partner];
    let left: THREE.Vector3, right: THREE.Vector3, headings: [number, number];
    if (kind === 'GazeTogether') {
      // Side by side in front of the bedroom window, both facing out, near enough to hold the inner paws.
      const window = lead.windowSpot;
      left = window.clone().setX(window.x - PAIR.GazeTogether.gap / 2);
      right = window.clone().setX(window.x + PAIR.GazeTogether.gap / 2);
      headings = [Math.PI, Math.PI];
    } else if (kind === 'WatchTVTogether') {
      // Use the first and middle cushions; the third holds the throw and pillow.
      left = SOFA_APPROACH.clone().setZ(SOFA_APPROACH.z - SOFA_PAIR_GAP);
      right = SOFA_APPROACH.clone();
      headings = [Math.PI / 2, Math.PI / 2];
    } else {
      // Nose to nose in the middle of the lead fox's room, where the walking area is free of furniture.
      const area = homeRooms[roomAt(lead.root.position)].walk;
      const x = (area.minX + area.maxX) / 2, z = (area.minZ + area.maxZ) / 2;
      left = new THREE.Vector3(x - PAIR.Boop.gap / 2, 0, z);
      right = new THREE.Vector3(x + PAIR.Boop.gap / 2, 0, z);
      headings = [Math.PI / 2, -Math.PI / 2];
    }
    // The lead takes whichever spot is nearer, so the two rarely cross paths.
    const leadLeft = lead.root.position.distanceTo(left) + partner.root.position.distanceTo(right)
      <= lead.root.position.distanceTo(right) + partner.root.position.distanceTo(left);
    this.spots = leadLeft ? [left, right] : [right, left];
    this.headings = leadLeft ? headings : [headings[1], headings[0]];
  }
  get who() { return `${this.members[0].name ?? '狐狸'}和${this.members[1].name ?? '狐狸'}`; }
  reserve() {
    if (this.kind !== 'WatchTVTogether') return true;
    const [lead, partner] = this.members;
    if (!lead.livingEnabled || !partner.livingEnabled || lead.household !== partner.household) return false;
    return lead.household?.claimTogether('living', this, this.members) ?? true;
  }
  leave(index: number) {
    this.over = true;
    this.departed.add(index);
    // Neither a timeout nor the first fox standing up frees the sofa while the other is still sitting there.
    if (this.departed.size === 2) this.members[0].household?.release(this);
  }
}

export class PairActivity {
  readonly cooldown = 0;
  phase: PairPhase = 'approach';
  elapsed = 0;
  motionTime = 0;
  pose = 0;
  readonly plan: PairPlan;
  private readonly index: 0 | 1;
  private finishFrom = 0;
  private waited = 0;
  constructor(plan: PairPlan, index: 0 | 1) { this.plan = plan; this.index = index; }
  get kind() { return this.plan.kind; }
  get together() { return this.plan; }
  get destination() { return this.plan.spots[this.index]; }
  get heading() { return this.plan.headings[this.index]; }
  private get partner() { return this.plan.members[1 - this.index]!; }
  // Waiting and booping read as standing still; gazing together reads as looking out of the window.
  get state(): 'Walk' | 'Idle' | 'Observe' | 'Living' {
    if (this.phase === 'approach') return 'Walk';
    if (this.kind === 'WatchTVTogether' && this.phase !== 'wait') return 'Living';
    return this.kind === 'GazeTogether' && this.phase !== 'wait' ? 'Observe' : 'Idle';
  }
  /** The other fox left before this one arrived: stop walking and carry on alone. */
  get abandoned() { return this.plan.over && (this.phase === 'approach' || this.phase === 'wait'); }
  get snapshot(): PairSnapshot {
    return { kind: this.kind, phase: this.phase, elapsed: this.elapsed, motionTime: this.motionTime, pose: this.pose,
      lead: this.index === 0, partner: this.partner.name ?? '狐狸', who: this.plan.who };
  }
  get living(): LivingSnapshot | null {
    if (this.kind !== 'WatchTVTogether') return null;
    return { kind: 'WatchTV', phase: this.phase === 'wait' ? 'approach' : this.phase,
      elapsed: this.elapsed, motionTime: this.motionTime, pose: this.pose, cupHold: 0, remote: this.index === 0 };
  }
  visual(): PairPose {
    const own = this.plan.members[this.index]!, partner = this.partner;
    // Split the offset to the other fox into straight ahead and sideways in this fox's own frame.
    const { z: ahead, x: lateral } = toFrame(own, partner.root.position);
    const side = Math.sign(lateral) || 1;
    // A hair of overlap so the noses really touch rather than stopping just short.
    const reach = Math.max(0, (ahead - own.muzzle.reach - partner.muzzle.reach) / 2) + .002;
    const rise = (partner.muzzle.height - own.muzzle.height) / 2;
    return { kind: this.kind, pose: this.pose, motionTime: this.motionTime, side, reach, rise, lateral,
      hand: this.kind === 'GazeTogether' ? this.hand() : null };
  }
  /** Where the inner paws meet. Two arms of fixed length can only meet on the circle where their reaches overlap;
   *  both foxes take its lowest point, so they work out the same spot and each paw gets there exactly. */
  private hand() {
    const own = this.plan.members[this.index]!, partner = this.partner;
    const mine = innerShoulder(own, partner.root.position);
    const line = toFrame(own, fromFrame(partner, innerShoulder(partner, own.root.position))).sub(mine);
    const apart = line.length(), a = own.shoulder.arm, b = partner.shoulder.arm;
    const along = THREE.MathUtils.clamp((apart * apart + a * a - b * b) / (2 * apart), 0, a);
    line.normalize();
    const down = new THREE.Vector3(0, -1, 0).projectOnPlane(line).normalize();
    return mine.addScaledVector(line, along).addScaledVector(down, Math.sqrt(a * a - along * along));
  }
  label() { return `${this.kind}/${this.phase}`; }
  needsSafeExit() { return this.phase === 'settle' || this.phase === 'active' || this.phase === 'finish'; }
  // Walking stops within arrival distance; shuffle the last few centimetres onto the spot so the two line up exactly.
  stepBack(position: THREE.Vector3, dt: number) {
    if (this.phase !== 'wait' && this.phase !== 'settle') return 0;
    const offset = this.destination.clone().sub(position).setY(0);
    const moved = Math.min(.25 * dt, offset.length());
    if (moved > 0) position.addScaledVector(offset.normalize(), moved);
    return moved;
  }
  arrive() {
    this.phase = 'wait'; this.elapsed = 0;
    this.plan.arrived.add(this.index);
    if (this.plan.arrived.size === 2) this.plan.go = true;
  }
  finish() {
    if (this.phase === 'finish') return;
    this.finishFrom = this.pose; this.phase = 'finish'; this.elapsed = 0;
    this.plan.over = true;
  }
  /** Leaving for any reason ends the pair for the other fox too. */
  leave() { this.plan.leave(this.index); }
  update(dt: number): 'done' | null {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'approach') return null;
    dt = Math.min(dt, .05);
    this.elapsed += dt;
    const duration = PAIR[this.kind].duration;
    const ease = this.kind === 'WatchTVTogether' ? 1.35 : PAIR.settle;
    const finish = this.kind === 'WatchTVTogether' ? 1.35 : PAIR.finish;
    if (this.phase === 'wait') {
      this.waited += dt;
      if (this.plan.over) return 'done';
      if (this.plan.go) { this.phase = 'settle'; this.elapsed = 0; }
      else if (this.waited >= PAIR.patience) { this.plan.over = true; return 'done'; }
    } else if (this.phase === 'settle') {
      this.pose = Math.min(1, this.elapsed / ease);
      if (this.plan.over) this.finish();
      else if (this.elapsed >= ease) { this.phase = 'active'; this.elapsed = 0; }
    } else if (this.phase === 'active') {
      this.motionTime = Math.min(this.elapsed, duration);
      if (this.plan.over || this.elapsed >= duration) this.finish();
    } else {
      this.pose = this.finishFrom * (1 - Math.min(1, this.elapsed / finish));
      if (this.elapsed >= finish) return 'done';
    }
    return null;
  }
}

export type PairInvite = 'accepted' | 'same' | 'self-busy' | 'partner-busy' | 'space-busy';

/** Starts pairs: on your invitation from the fox you are talking to, or now and then on their own. */
export class PairPlanner {
  private readonly foxes: readonly [Character, Character];
  private readonly random: () => number;
  private rest = 0;
  constructor(foxes: readonly [Character, Character], random: () => number = Math.random) {
    this.foxes = foxes; this.random = random;
  }
  invite(kind: PairAction, lead: Character): PairInvite {
    const partner = this.foxes[0] === lead ? this.foxes[1] : this.foxes[0];
    if (lead.together?.kind === kind) return 'same';
    if (!lead.canJoin) return 'self-busy';
    if (!partner.canJoin) return 'partner-busy';
    return this.start(kind, lead, partner, true) ? 'accepted' : 'space-busy';
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.rest = Math.max(0, this.rest - dt);
    const [a, b] = this.foxes;
    if (this.rest > 0 || !a.free || !b.free || roomAt(a.root.position) !== roomAt(b.root.position)) return;
    if (this.random() >= PAIR.chance * Math.min(dt, .05)) return;
    const lead = this.random() < .5 ? a : b;
    const room = roomAt(lead.root.position);
    const kind: PairAction = room === 'Bedroom' && this.random() < .4 ? 'GazeTogether'
      : room === 'LivingRoom' && this.random() < .5 ? 'WatchTVTogether' : 'Boop';
    this.start(kind, lead, lead === a ? b : a, false);
  }
  private start(kind: PairAction, lead: Character, partner: Character, player: boolean) {
    const plan = new PairPlan(kind, lead, partner);
    if (!plan.reserve()) return false;
    lead.join(new PairActivity(plan, 0), player);
    partner.join(new PairActivity(plan, 1), player);
    this.rest = PAIR.rest;
    return true;
  }
}
