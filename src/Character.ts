import * as THREE from 'three';
import { createFoxVisual, foxLooks, type FoxLook } from './createFoxVisual.ts';
import { Household, activityGroup } from './Household.ts';
import { LifeNeeds, type NeedsOptions } from './Needs.ts';
import { SLEEP, SleepActivity } from './sleep.ts';
import { ReadActivity } from './read.ts';
import { EatActivity } from './eat.ts';
import { DailyActivity, type DailyKind } from './daily.ts';
import { PET, type PetReaction, type PetSnapshot } from './pet.ts';
import { NOSE, PAW, PairActivity, type Muzzle, type PairAction, type PairSnapshot, type Shoulder } from './Pair.ts';
import { homeRooms, homeRoute, isRoomId, type RoomId } from './HomeNavigation.ts';
import { LivingActivity, isLivingAction, livingActions, type LivingAction } from './LivingActivity.ts';
import { GardenActivity, isGardenAction, gardenActions, type GardenAction } from './GardenActivity.ts';
import { KitchenActivity, isKitchenAction, kitchenActions, type KitchenAction } from './KitchenActivity.ts';

export type CharacterState = 'Idle' | 'Walk' | 'Observe' | 'Sleep' | 'Read' | 'Eat' | 'Living' | DailyKind;
export type IdleVariation = 'Breathe' | 'Look around';
export interface CharacterLayout {
  windowPosition: THREE.Vector3;
  windowHeading: number;
  bed?: { position: THREE.Vector3; heading: number; corner: THREE.Vector3 };
  reading?: { position: THREE.Vector3; heading: number };
  dining?: { position: THREE.Vector3; heading: number };
  leisure?: { clean: THREE.Vector3; play: THREE.Vector3; heading: number;
    storage: { position: THREE.Vector3; tool: THREE.Vector3; heading: number } };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  connectedRooms?: boolean;
  balcony?: boolean;
  kitchen?: boolean;
}
export interface CharacterOptions {
  name?: string;
  look?: FoxLook;
  /** Shared by the foxes of one home so they do not use the same spot or prop at once. */
  household?: Household;
  /** Enable gentle needs in the live home; isolated animation/review fixtures can keep the baseline chooser. */
  life?: NeedsOptions;
}
export const OBSERVE_SECONDS = 4;
export const ARRIVAL_DISTANCE = 0.035;
const TURN_SPEED = 3.6;
const angleDifference = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

type SoloKind = 'Bed' | 'Bookshelf' | 'Food' | DailyKind | LivingAction | GardenAction | KitchenAction;
type ActivityKind = SoloKind | PairAction;
type ActionTarget = 'Window' | Exclude<SoloKind, 'Stretch'>;
// Each life activity owns its clock, props, labels and safe exit; Character walks, chooses and dispatches.
interface Activity {
  readonly kind: ActivityKind;
  readonly phase: string;
  readonly pose: number;
  readonly destination: THREE.Vector3 | null;
  readonly heading: number;
  readonly state: CharacterState;
  readonly cooldown: number;
  label(next: string | null): string;
  needsSafeExit(position: THREE.Vector3): boolean;
  arrive(): void;
  finish(): 'move' | null | void;
  update(dt: number): 'move' | 'done' | null;
  stepBack?(position: THREE.Vector3, dt: number): number;
  /** Shared by both foxes of a pair, so neither waits behind the other on the way. */
  readonly together?: object;
  /** The activity ended elsewhere before it began here: stop and carry on. */
  readonly abandoned?: boolean;
  leave?(): void;
}
// Approaching, carrying and returning are walks; every other phase runs the activity clock.
const walking = (phase: string) => phase === 'approach' || phase === 'carry' || phase === 'return';

export class Character {
  readonly root = new THREE.Group();
  readonly name: string | undefined;
  /** The fur colour, so the interface can mark which fox is which. */
  readonly coat: string;
  /** Where the nose tip sits when standing: how far in front of the feet, and how high. */
  readonly muzzle: Muzzle;
  /** The right shoulder when standing (the left one mirrors x), and how far the paw hangs from it. */
  readonly shoulder: Shoulder;
  private readonly visual: ReturnType<typeof createFoxVisual>;
  readonly household: Household | null;
  private readonly lifeNeeds: LifeNeeds | null;
  private yielding: Character | null = null;
  private currentState: CharacterState = 'Idle';
  private commandActive = false;
  private destination: THREE.Vector3 | null = null;
  private idleRemaining: number;
  private variation: IdleVariation = 'Breathe';
  private observeTime = 0;
  private elapsed = 0;
  private speed = 0;
  private turnVelocity = 0;
  private arrivalSettle = 0;
  private targetKind: 'Room' | ActionTarget | RoomId | PairAction | null = null;
  private activity: Activity | null = null;
  private readonly cooldowns = new Map<ActivityKind, number>();
  private completedWalk = false;
  private consecutiveWalks = 0;
  private corner: THREE.Vector3 | null = null;
  private route: THREE.Vector3[] = [];
  // One replacement during a safe exit, shared by the actual anchored actions.
  private afterExit: ActionTarget | RoomId | null = null;
  // A pair waiting for this fox to finish what it was doing.
  private pendingJoin: { activity: PairActivity; player: boolean } | null = null;
  private readingCount = 0;
  private roomWalkCount = 0;
  private stretchAfterWalk = false;
  private petting: PetSnapshot | null = null;
  private petTimes: number[] = [];
  private readonly direction = new THREE.Vector3();
  private readonly layout: CharacterLayout;
  private readonly random: () => number;

  constructor(layout: CharacterLayout, random: () => number = Math.random, options: CharacterOptions = {}) {
    this.visual = createFoxVisual(options.look);
    this.name = options.name;
    this.coat = (options.look ?? foxLooks.orange).palette.fur;
    this.household = options.household ?? null;
    this.lifeNeeds = options.life ? new LifeNeeds(options.life) : null;
    this.layout = { ...layout, windowPosition: layout.windowPosition.clone(), bounds: { ...layout.bounds } };
    if (layout.bed) this.layout.bed = { position: layout.bed.position.clone(), heading: layout.bed.heading, corner: layout.bed.corner.clone() };
    if (layout.reading) this.layout.reading = { position: layout.reading.position.clone(), heading: layout.reading.heading };
    if (layout.dining) this.layout.dining = { position: layout.dining.position.clone(), heading: layout.dining.heading };
    if (layout.leisure) this.layout.leisure = { clean: layout.leisure.clean.clone(), play: layout.leisure.play.clone(), heading: layout.leisure.heading,
      storage: { position: layout.leisure.storage.position.clone(), tool: layout.leisure.storage.tool.clone(), heading: layout.leisure.storage.heading } };
    this.random = random;
    this.idleRemaining = this.nextIdleDuration();
    this.root.name = 'Character';
    this.root.add(this.visual.root);
    this.root.updateWorldMatrix(false, true);
    const nose = this.root.getObjectByName('FoxHead')!.localToWorld(NOSE.clone());
    this.muzzle = { reach: nose.z, height: nose.y };
    const arm = this.root.getObjectByName('FoxArmR')!, shoulder = arm.getWorldPosition(new THREE.Vector3());
    this.shoulder = { position: shoulder, arm: arm.localToWorld(PAW.clone()).distanceTo(shoulder) };
  }
  get state() { return this.currentState; }
  get needs() { return this.lifeNeeds?.snapshot ?? null; }
  get needHint() { return this.lifeNeeds?.hint ?? null; }
  get livingEnabled() { return this.layout.connectedRooms === true; }
  dispose() {
    this.clearActivity();
    this.pendingJoin?.activity.leave();
    this.pendingJoin = null;
    this.afterExit = null;
    this.visual.dispose();
  }
  get source() { return this.commandActive ? 'Player Command' : 'Autonomous'; }
  get target() { return this.destination?.clone() ?? null; }
  get idleVariation() { return this.variation; }
  get observeElapsed() { return this.observeTime; }
  get targetLabel() { return this.targetKind === 'Food' && this.eating?.phase !== 'approach' ? 'DiningArea' : this.targetKind; }
  private get sleeping() { return this.activity instanceof SleepActivity ? this.activity : null; }
  private get reading() { return this.activity instanceof ReadActivity ? this.activity : null; }
  private get eating() { return this.activity instanceof EatActivity ? this.activity : null; }
  private get daily() { return this.activity instanceof DailyActivity ? this.activity : null; }
  private cooldownLeft(kind: ActivityKind) { return this.cooldowns.get(kind) ?? 0; }
  get sleepPhase() { return this.sleeping?.phase ?? null; }
  get sleepElapsed() { return this.sleeping?.elapsed ?? 0; }
  get sleepCooldownRemaining() { return this.cooldownLeft('Bed'); }
  get readPhase() { return this.reading?.phase ?? null; }
  get readElapsed() { return this.reading?.elapsed ?? 0; }
  get readCooldownRemaining() { return this.cooldownLeft('Bookshelf'); }
  get eatPhase() { return this.eating?.phase ?? null; }
  get eatElapsed() { return this.eating?.elapsed ?? 0; }
  get eatCooldownRemaining() { return this.cooldownLeft('Food'); }
  get activityKind() { return this.daily?.kind ?? null; }
  get activityPhase() { return this.daily?.phase ?? null; }
  get activityElapsed() { return this.daily?.elapsed ?? 0; }
  get livingActivity() { return this.activity instanceof LivingActivity ? this.activity
    : this.activity instanceof PairActivity ? this.activity.living : null; }
  get gardenActivity() { return this.activity instanceof GardenActivity ? this.activity : null; }
  get gardenEnabled() { return this.layout.balcony === true; }
  get kitchenActivity() { return this.activity instanceof KitchenActivity ? this.activity : null; }
  get kitchenEnabled() { return this.layout.kitchen === true; }
  get cleanToolInUse() { return this.daily?.kind === 'Clean' && this.daily.pose > 0; }
  get cleanCooldownRemaining() { return this.cooldownLeft('Clean'); }
  get playCooldownRemaining() { return this.cooldownLeft('Play'); }
  get microEvent(): 'Doze' | 'Stretch' | null {
    if (this.daily?.kind === 'Stretch' && this.daily.phase === 'active') return 'Stretch';
    return this.reading?.phase === 'read' && this.dozePose > .1 ? 'Doze' : null;
  }
  private get dozePose() { return this.reading?.dozePose ?? 0; }
  get petReaction(): PetSnapshot | null { return this.petting; }
  get together(): PairSnapshot | null { return this.activity instanceof PairActivity ? this.activity.snapshot : null; }
  get windowSpot() { return this.layout.windowPosition.clone(); }
  /** Free for an autonomous pair: idling or wandering, with nothing under way and no invitation of yours to finish. */
  get free() { return (this.currentState === 'Idle' || this.currentState === 'Walk') && !this.activity && !this.commandActive; }
  /** A pair invitation can include this fox unless it is still finishing one of your invitations. */
  get canJoin() { return !this.commandActive; }
  /** Join a pair, after safely finishing whatever is under way, the same way an invitation would. */
  join(activity: PairActivity, player: boolean): boolean {
    if (this.commandActive) return false;
    const current = this.activity;
    if (current?.needsSafeExit(this.root.position)) {
      this.commandActive = true; this.afterExit = null; this.pendingJoin = { activity, player };
      if (current.finish() === 'move') this.follow();
      else this.currentState = current.state;
      return true;
    }
    this.clearActivity();
    this.start(activity, player);
    return true;
  }
  /** This fox waits behind the given housemate instead of walking through it. */
  yieldTo(other: Character | null) { this.yielding = other; }
  /** Whether this fox is using or reserving the spot that the given invitation needs. */
  occupies(kind: ActionTarget) {
    const group = activityGroup(kind);
    if (group === null) return false;
    if (!this.household) return !!this.activity && activityGroup(this.activity.kind) === group;
    const owner = this.household.owner(group);
    return owner !== null && (owner === this || owner === this.activity?.together || owner === this.pendingJoin?.activity.plan);
  }
  private blockedBy(other: Character) {
    if (other.state !== 'Idle' && other.state !== 'Walk' && other.state !== 'Observe') return false;
    const gap = other.root.position.clone().sub(this.root.position);
    if (gap.length() > .85) return false;
    return gap.normalize().dot(new THREE.Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y))) > .2;
  }
  /** A tap on the fox itself: a reaction layered on whatever it is doing, never a new intent. */
  pet(): PetReaction {
    if (this.petting?.kind === 'shy') return 'shy';
    this.petTimes = this.petTimes.filter(at => this.elapsed - at < PET.burstWindow);
    this.petTimes.push(this.elapsed);
    const kind: PetReaction = this.petTimes.length >= PET.shyAfter ? 'shy'
      : (this.sleeping?.pose ?? 0) > 0 ? 'twitch'
      : this.currentState === 'Idle' || this.currentState === 'Observe' ? 'nuzzle' : 'glance';
    if (kind === 'shy') this.petTimes = [];
    this.petting = { kind, time: 0 };
    return kind;
  }
  get action() {
    if (this.activity) return this.activity.label(this.afterExit);
    if (isRoomId(this.targetKind)) {
      return this.currentState === 'Observe' ? `Visit ${this.targetKind}` : `Walk to ${this.targetKind}`;
    }
    if (this.currentState === 'Observe') return 'Observe environment';
    if (this.currentState === 'Walk') return this.commandActive ? 'Walk to window' : 'Autonomous walk';
    return 'Autonomous idle';
  }
  /** Routes any life invitation, from the UI or after a safe exit, to its request. */
  request(action: ActionTarget): boolean {
    if (action === 'Window') return this.requestWindowObserve();
    if (action === 'Bed') return this.requestSleep();
    if (action === 'Bookshelf') return this.requestRead();
    if (action === 'Food') return this.requestEat();
    if (action === 'Clean') return this.requestClean();
    if (action === 'Play') return this.requestPlay();
    if (isLivingAction(action)) return this.requestLivingAction(action);
    if (isGardenAction(action)) return this.requestGardenAction(action);
    return this.requestKitchenAction(action);
  }
  requestWindowObserve(): boolean {
    if (this.commandActive) return false;
    if (this.exitFor('Window')) return true;
    this.clearActivity();
    this.commandActive = true;
    this.targetKind = 'Window';
    this.arrivalSettle = 0;
    this.destination = this.layout.windowPosition.clone();
    this.currentState = 'Walk';
    this.observeTime = 0;
    this.routePastBed();
    return true;
  }
  requestSleep(): boolean { return !!this.layout.bed && this.requestActivity('Bed'); }
  requestRead(): boolean { return !!this.layout.reading && this.requestActivity('Bookshelf'); }
  requestEat(): boolean { return !!this.layout.dining && this.requestActivity('Food'); }
  requestClean(): boolean { return !!this.layout.leisure && this.requestActivity('Clean'); }
  requestPlay(): boolean { return this.layout.connectedRooms ? this.requestLivingAction('Exercise') : !!this.layout.leisure && this.requestActivity('Play'); }
  requestLivingAction(kind: LivingAction): boolean { return !!this.layout.connectedRooms && isLivingAction(kind) && this.requestActivity(kind); }
  requestGardenAction(kind: GardenAction): boolean { return !!this.layout.balcony && isGardenAction(kind) && this.requestActivity(kind); }
  requestKitchenAction(kind: KitchenAction): boolean { return !!this.layout.kitchen && isKitchenAction(kind) && this.requestActivity(kind); }
  requestRoomVisit(room: RoomId): boolean {
    if (!this.layout.connectedRooms || this.commandActive || !isRoomId(room) || room === 'Balcony' && !this.layout.balcony) return false;
    if (room === 'Kitchen' && !this.layout.kitchen) return false;
    if (this.exitFor(room)) return true;
    this.clearActivity();
    this.commandActive = true;
    this.targetKind = room;
    this.destination = new THREE.Vector3(homeRooms[room].centerX, 0, room === 'Bedroom' ? .25 : room === 'LivingRoom' ? 6.2 : homeRooms[room].centerZ);
    this.arrivalSettle = this.observeTime = 0;
    this.currentState = 'Walk';
    this.routePastBed();
    return true;
  }
  // One invitation at a time: a repeat is ignored and a started activity exits safely first.
  private requestActivity(kind: Exclude<SoloKind, 'Stretch'>) {
    if (this.commandActive || this.activity?.kind === kind) return false;
    if (this.household && !this.household.free(activityGroup(kind), this)) return false;
    if (this.exitFor(kind)) {
      // Keep the current spot until its safe exit ends, and reserve the accepted destination now.
      this.household?.claim(activityGroup(kind), this);
      return true;
    }
    this.begin(kind, true);
    return true;
  }
  private clearActivity() { this.activity?.leave?.(); this.activity = null; this.household?.release(this); }
  private create(kind: SoloKind): Activity {
    if (kind === 'Bed') return new SleepActivity(this.layout.bed!);
    if (kind === 'Food') return new EatActivity(this.layout.dining!);
    if (kind === 'Bookshelf') {
      // Every other read in the daily-life home nods off once.
      this.readingCount++;
      return new ReadActivity(this.layout.reading!, !!this.layout.leisure && this.readingCount % 2 === 1);
    }
    if (isLivingAction(kind)) return new LivingActivity(kind);
    if (isGardenAction(kind)) return new GardenActivity(kind);
    if (isKitchenAction(kind)) return new KitchenActivity(kind);
    return new DailyActivity(kind, this.layout.leisure!);
  }
  private begin(kind: SoloKind, player: boolean) { this.start(this.create(kind), player); }
  private start(activity: Activity, player: boolean) {
    const kind = activity.kind;
    // Let go of whatever came before, so its spot and any pair it belonged to are released at once.
    this.clearActivity();
    this.activity = activity;
    this.household?.claim(activityGroup(kind), this);
    this.commandActive = player;
    // A stretch starts in place; every other activity first walks to its spot.
    this.targetKind = kind === 'Stretch' ? null : kind;
    this.destination = this.activity.destination?.clone() ?? null;
    this.arrivalSettle = 0;
    this.currentState = this.activity.state;
    if (this.destination) this.routePastBed();
  }
  // Props lead the fox onward: the cup to the sofa and back, the broom to the rug and back.
  private follow() {
    this.destination = this.activity!.destination!.clone(); this.arrivalSettle = 0;
    this.currentState = 'Walk'; this.routePastBed();
  }
  private exitFor(target: ActionTarget | RoomId) {
    const activity = this.activity;
    if (!activity?.needsSafeExit(this.root.position)) return false;
    this.commandActive = true;
    this.afterExit = target;
    if (activity.finish() === 'move') this.follow();
    else this.currentState = activity.state;
    return true;
  }
  private completeExit() {
    const next = this.afterExit, join = this.pendingJoin;
    if (!next && !join && this.sleeping?.phase === 'wake' && this.layout.leisure) this.stretchAfterWalk = true;
    this.afterExit = null;
    this.pendingJoin = null;
    this.consecutiveWalks = 0;
    // Release the old claims and start the accepted invitation synchronously, before another fox updates.
    this.enterIdle();
    if (join) {
      if (!join.activity.abandoned) this.start(join.activity, join.player);
      else join.activity.leave();
    }
    else if (isRoomId(next)) this.requestRoomVisit(next);
    else if (next) this.request(next);
  }
  private routePastBed() {
    const bed = this.layout.bed;
    if (this.layout.connectedRooms) {
      this.route = homeRoute(this.root.position, this.destination!, bed?.corner, this.targetKind === 'Bed');
      this.corner = this.route.shift() ?? null;
      return;
    }
    // One room-specific bed-foot corner, never an intent queue or generic navigation.
    this.corner = bed && (this.targetKind === 'Bed' || this.root.position.x < -1.8)
      && this.root.position.distanceTo(this.destination!) > ARRIVAL_DISTANCE
      ? bed.corner.clone() : null;
    if (this.targetKind === 'Bed' && this.root.position.x < -1.8) this.corner = null;
  }
  private nextIdleDuration() { return 2.5 + this.random() * 2.7; }
  private enterIdle() {
    this.clearActivity();
    this.currentState = 'Idle';
    this.commandActive = false;
    this.destination = null;
    this.targetKind = null;
    this.corner = null;
    this.route = [];
    this.observeTime = 0;
    this.speed = 0;
    this.turnVelocity = 0;
    this.arrivalSettle = 0;
    this.idleRemaining = this.nextIdleDuration();
    this.variation = this.variation === 'Breathe' ? 'Look around' : 'Breathe';
  }
  private chooseDestination() {
    const roomChoice = this.layout.connectedRooms ? this.random() : 0;
    const b = this.layout.kitchen ? roomChoice > .8 ? homeRooms.Kitchen.walk : roomChoice > .6 ? homeRooms.Balcony.walk
      : roomChoice > .4 ? homeRooms.LivingRoom.walk : this.layout.bounds
      : this.layout.balcony && roomChoice > .75 ? homeRooms.Balcony.walk
      : this.layout.connectedRooms && roomChoice > .5 ? homeRooms.LivingRoom.walk : this.layout.bounds;
    const target = new THREE.Vector3();
    // The whole convex activity area and window approach are furniture-free.
    for (let attempt = 0; attempt < 8; attempt++) {
      target.set(THREE.MathUtils.lerp(b.minX, b.maxX, this.random()), 0,
        THREE.MathUtils.lerp(b.minZ, b.maxZ, this.random()));
      if (target.distanceTo(this.root.position) >= 1.1) return target;
    }
    // Bounded fallback guarantees that the next walk also leaves the window.
    target.set(this.root.position.x > 0 ? b.minX : b.maxX, 0, b.maxZ);
    return target;
  }
  private turnTo(heading: number, dt: number) {
    const difference = angleDifference(heading, this.root.rotation.y);
    const desired = THREE.MathUtils.clamp(difference * 6, -TURN_SPEED, TURN_SPEED);
    this.turnVelocity = THREE.MathUtils.damp(this.turnVelocity, desired, 10, dt);
    const step = this.turnVelocity * dt;
    // Ease angular speed at both ends without overshooting the requested heading.
    if (Math.sign(step) === Math.sign(difference) && Math.abs(step) > Math.abs(difference)) {
      this.root.rotation.y += difference;
      this.turnVelocity = 0;
    } else this.root.rotation.y += step;
    return Math.abs(angleDifference(heading, this.root.rotation.y));
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.lifeNeeds?.update(dt, this.activity?.kind ?? null, this.activity?.phase ?? null, this.currentState === 'Walk');
    this.elapsed += dt;
    for (const [kind, cooldown] of this.cooldowns) this.cooldowns.set(kind, Math.max(0, cooldown - dt));
    if (this.activity?.abandoned) this.enterIdle();
    if (this.petting) {
      this.petting.time += dt;
      if (this.petting.time >= PET.duration[this.petting.kind]) this.petting = null;
    }
    let moved = 0;
    let lookHeading = this.root.rotation.y;
    const previousHeading = this.root.rotation.y;
    const activity = this.activity;
    if (activity && !walking(activity.phase)) {
      const result = activity.update(dt);
      if (result === 'done') { this.cooldowns.set(activity.kind, activity.cooldown); this.completeExit(); }
      else {
        this.currentState = activity.state;
        if (result === 'move') this.follow();
        moved = activity.stepBack?.(this.root.position, dt) ?? 0;
      }
    } else if (this.currentState === 'Idle') {
      this.idleRemaining -= dt;
      if (this.idleRemaining <= 0) {
        const ready = (kind: SoloKind) => this.completedWalk && this.cooldownLeft(kind) === 0
          && (!this.household || this.household.free(activityGroup(kind), this));
        const eligible: SoloKind[] = [];
        if (this.layout.bed && ready('Bed')) eligible.push('Bed');
        if (this.layout.reading && ready('Bookshelf')) eligible.push('Bookshelf');
        if (this.layout.dining && ready('Food')) eligible.push('Food');
        if (this.layout.leisure && ready('Clean')) eligible.push('Clean');
        if (!this.layout.connectedRooms && this.layout.leisure && ready('Play')) eligible.push('Play');
        if (this.layout.connectedRooms) eligible.push(...livingActions.filter(ready));
        if (this.layout.balcony) eligible.push(...gardenActions.filter(ready));
        if (this.layout.kitchen) eligible.push(...kitchenActions.filter(ready));
        // Baseline activities have weight 1; needs and preferences adjust them in the live home. Walk keeps weight 3.
        const walkWeight = this.consecutiveWalks >= 3 ? 0 : SLEEP.walkWeight;
        const roll = eligible.length && !this.stretchAfterWalk ? this.random() : null;
        const kind = roll === null ? undefined : this.lifeNeeds ? this.lifeNeeds.choose(eligible, walkWeight, roll)
          : eligible[Math.floor(roll * (eligible.length + walkWeight))];
        if (kind) this.begin(kind, false);
        else {
          this.destination = this.chooseDestination();
          this.targetKind = 'Room';
          this.currentState = 'Walk';
          this.consecutiveWalks++;
          this.routePastBed();
        }
      }
    } else if (this.currentState === 'Walk' && this.destination) {
      this.direction.subVectors(this.corner ?? this.destination, this.root.position);
      const distance = this.direction.length();
      if (distance <= ARRIVAL_DISTANCE) {
        lookHeading = this.activity ? this.activity.heading : this.targetKind === 'LivingRoom' ? 0 : this.layout.windowHeading;
        this.speed = 0;
        if (this.corner) this.corner = this.route.shift() ?? null;
        else if (this.targetKind === 'Room') {
          this.completedWalk = true;
          this.roomWalkCount++;
          this.enterIdle();
          if (this.layout.leisure && (this.stretchAfterWalk || this.roomWalkCount % 4 === 0)) {
            this.stretchAfterWalk = false;
            this.begin('Stretch', false);
          }
        }
        else if (this.turnTo(lookHeading, dt) <= 0.025) {
          // A short foreground settle belongs to the existing approach, not a new State.
          this.arrivalSettle += dt;
          if (this.arrivalSettle >= 0.18) {
            if (this.activity) { this.activity.arrive(); this.currentState = this.activity.state; }
            else { this.currentState = 'Observe'; this.observeTime = 0; }
          }
        }
      } else {
        lookHeading = Math.atan2(this.direction.x, this.direction.z);
        const angle = this.turnTo(lookHeading, dt);
        // Continuously feed forward motion into the turn; never travel sideways or backwards.
        const alignment = Math.pow(Math.max(0, Math.cos(angle)), 3);
        let desiredSpeed = Math.min(1.05, distance * 2.6) * alignment;
        // A trailing fox slows to a stop behind a housemate standing or walking just ahead,
        // except on the way to a spot beside that same housemate.
        const sharing = !!this.activity?.together && this.activity.together === this.yielding?.activity?.together;
        if (this.yielding && !sharing && this.blockedBy(this.yielding)) desiredSpeed = 0;
        this.speed = THREE.MathUtils.damp(this.speed, desiredSpeed, 6, dt);
        moved = Math.min(this.speed * dt * alignment, distance);
        this.direction.set(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
        // Clip forward distance, not individual coordinates: stay in the existing safe area
        // without introducing sideways sliding along its edges or a new pathfinding system.
        const b = this.layout.bounds;
        for (const [axis, min, max] of [
          ['x', Math.min(b.minX, this.layout.windowPosition.x, this.layout.bed?.position.x ?? b.minX), Math.max(b.maxX, this.layout.windowPosition.x, this.layout.reading?.position.x ?? b.maxX, this.layout.dining?.position.x ?? b.maxX, this.layout.balcony ? 8.4 : b.maxX)],
          ['z', Math.min(b.minZ, this.layout.windowPosition.z), Math.max(b.maxZ, this.layout.windowPosition.z, this.layout.bed?.position.z ?? b.maxZ, this.layout.dining?.position.z ?? b.maxZ, this.layout.leisure?.storage.position.z ?? b.maxZ, this.layout.kitchen ? 9.1 : this.layout.connectedRooms ? 7.4 : b.maxZ)],
        ] as const) {
          const forward = this.direction[axis];
          if (Math.abs(forward) > 1e-8) {
            const edge = forward > 0 ? max : min;
            moved = Math.min(moved, Math.max(0, (edge - this.root.position[axis]) / forward));
          }
        }
        this.root.position.addScaledVector(this.direction, moved);
      }
    } else if (this.currentState === 'Observe') {
      this.observeTime += dt;
      if (this.observeTime >= OBSERVE_SECONDS) this.enterIdle();
    }
    const cleanMode = this.daily?.cleanMode;
    const cleanPark = this.daily?.kind === 'Clean' ? this.layout.leisure!.storage.tool.clone().sub(this.root.position)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.root.rotation.y).divideScalar(this.visual.root.scale.x) : undefined;
    this.visual.animate({ dt, time: this.elapsed, distance: moved, state: this.currentState,
      variation: this.variation, observeTime: this.observeTime,
      turnRate: (this.root.rotation.y - previousHeading) / dt,
      headingError: this.currentState === 'Walk' ? angleDifference(lookHeading, this.root.rotation.y) : 0,
      preparingObserve: this.commandActive && this.currentState === 'Walk'
        && this.targetKind === 'Window' && !this.sleeping && this.root.position.distanceTo(this.layout.windowPosition) < 0.14,
      sleepPose: this.sleeping?.pose ?? 0, sleepPhase: this.sleeping?.phase ?? null, sleepTime: this.sleeping?.elapsed ?? 0,
      readPose: this.reading?.pose ?? 0, readPhase: this.reading?.phase ?? null, readTime: this.reading?.elapsed ?? 0,
      eatPose: this.eating?.pose ?? 0, eatTime: this.eating?.motionTime ?? 0,
      dailyKind: this.daily?.kind ?? null, dailyPose: this.daily?.pose ?? 0, dailyTime: this.daily?.motionTime ?? 0, dozePose: this.dozePose,
      cleanMode, cleanPark, cleanParkYaw: -this.root.rotation.y,
      living: this.livingActivity, garden: this.gardenActivity, kitchen: this.kitchenActivity, pet: this.petting,
      pair: this.activity instanceof PairActivity ? this.activity.visual() : null });
  }
}
