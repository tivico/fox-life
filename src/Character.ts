import * as THREE from 'three';
import { createFoxVisual } from './createFoxVisual.ts';
import { SLEEP, SleepActivity } from './sleep.ts';
import { READ, ReadActivity } from './read.ts';
import { EAT, EatActivity } from './eat.ts';
import { DAILY, type DailyKind, type DailyPhase } from './daily.ts';
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
export const OBSERVE_SECONDS = 4;
export const ARRIVAL_DISTANCE = 0.035;
const TURN_SPEED = 3.6;
const angleDifference = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class Character {
  readonly root = new THREE.Group();
  private readonly visual = createFoxVisual();
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
  private targetKind: 'Room' | 'Window' | 'Bed' | 'Bookshelf' | 'Food' | 'Clean' | 'Play' | RoomId | LivingAction | GardenAction | KitchenAction | null = null;
  private sleeping: SleepActivity | null = null;
  private sleepCooldown = 0;
  private completedWalk = false;
  private consecutiveWalks = 0;
  private corner: THREE.Vector3 | null = null;
  private route: THREE.Vector3[] = [];
  // One replacement during a safe exit, shared by the actual anchored actions.
  private afterExit: 'Window' | 'Bed' | 'Bookshelf' | 'Food' | 'Clean' | 'Play' | RoomId | LivingAction | GardenAction | KitchenAction | null = null;
  private living: LivingActivity | null = null;
  private garden: GardenActivity | null = null;
  private readonly gardenCooldowns = new Map<GardenAction, number>();
  private kitchen: KitchenActivity | null = null;
  private readonly kitchenCooldowns = new Map<KitchenAction, number>();
  private readonly livingCooldowns = new Map<LivingAction, number>();
  private reading: ReadActivity | null = null;
  private readCooldown = 0;
  private eating: EatActivity | null = null;
  private eatCooldown = 0;
  private dailyKind: DailyKind | null = null;
  private dailyPhase: DailyPhase | null = null;
  private dailyTime = 0;
  private dailyPose = 0;
  private dailyMotionTime = 0;
  private dailyFinishFrom = 1;
  private cleanCooldown = 0;
  private playCooldown = 0;
  private readingCount = 0;
  private roomWalkCount = 0;
  private stretchAfterWalk = false;
  private readonly direction = new THREE.Vector3();
  private readonly layout: CharacterLayout;
  private readonly random: () => number;

  constructor(layout: CharacterLayout, random: () => number = Math.random) {
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
  }
  get state() { return this.currentState; }
  dispose() { this.visual.dispose(); }
  get source() { return this.commandActive ? 'Player Command' : 'Autonomous'; }
  get target() { return this.destination?.clone() ?? null; }
  get idleVariation() { return this.variation; }
  get observeElapsed() { return this.observeTime; }
  get targetLabel() { return this.targetKind === 'Food' && this.eating?.phase !== 'approach' ? 'DiningArea' : this.targetKind; }
  get sleepPhase() { return this.sleeping?.phase ?? null; }
  get sleepElapsed() { return this.sleeping?.elapsed ?? 0; }
  get sleepCooldownRemaining() { return this.sleepCooldown; }
  get readPhase() { return this.reading?.phase ?? null; }
  get readElapsed() { return this.reading?.elapsed ?? 0; }
  get readCooldownRemaining() { return this.readCooldown; }
  get eatPhase() { return this.eating?.phase ?? null; }
  get eatElapsed() { return this.eating?.elapsed ?? 0; }
  get eatCooldownRemaining() { return this.eatCooldown; }
  get activityKind() { return this.dailyKind; }
  get activityPhase() { return this.dailyPhase; }
  get activityElapsed() { return this.dailyTime; }
  get livingActivity() { return this.living; }
  get gardenActivity() { return this.garden; }
  get gardenEnabled() { return this.layout.balcony === true; }
  get kitchenActivity() { return this.kitchen; }
  get kitchenEnabled() { return this.layout.kitchen === true; }
  get cleanToolInUse() { return this.dailyKind === 'Clean' && this.dailyPose > 0; }
  get cleanCooldownRemaining() { return this.cleanCooldown; }
  get playCooldownRemaining() { return this.playCooldown; }
  get microEvent(): 'Doze' | 'Stretch' | null {
    if (this.dailyKind === 'Stretch' && this.dailyPhase === 'active') return 'Stretch';
    return this.reading?.phase === 'read' && this.dozePose > .1 ? 'Doze' : null;
  }
  private get dozePose() { return this.reading?.dozePose ?? 0; }
  get action() {
    if (this.kitchen) return `${this.kitchen.kind}/${this.kitchen.phase}`;
    if (this.garden) return `${this.garden.kind}/${this.garden.phase}`;
    if (this.living) return `${this.living.kind}/${this.living.phase}`;
    if (this.dailyKind) {
      if (this.dailyPhase === 'carry') return 'Carry broom to rug';
      if (this.dailyPhase === 'return') return 'Return broom';
      if (this.dailyPhase === 'approach') return this.dailyKind === 'Clean' ? 'Walk to broom' : 'Walk to play';
      if (this.dailyPhase === 'finish' && this.dailyKind === 'Clean') return 'Putting broom back';
      if (this.dailyPhase === 'finish') return this.dailyKind === 'Stretch' ? 'Finishing stretch' : 'Putting activity away';
      if (this.dailyPhase === 'settle') return this.dailyKind === 'Clean' ? 'Getting broom' : this.dailyKind === 'Play' ? 'Getting yarn' : 'Preparing stretch';
      return this.dailyKind === 'Clean' ? 'Sweeping' : this.dailyKind === 'Play' ? 'Playing with yarn' : 'Stretching';
    }
    if (this.microEvent === 'Doze') return 'Dozing over book';
    if (this.eating?.phase === 'finish') return 'Finishing meal';
    if (this.eating?.phase === 'eat') return 'Eating';
    if (this.eating?.phase === 'settle') return 'Smelling food';
    if (this.targetKind === 'Food') return 'Walk to dining area';
    if (this.reading?.phase === 'finish') return 'Putting book away';
    if (this.reading?.phase === 'read') return 'Reading';
    if (this.reading?.phase === 'settle') return 'Opening book';
    if (this.targetKind === 'Bookshelf') return 'Walk to reading area';
    if (this.sleeping?.phase === 'wake') return this.afterExit === 'Window' ? 'Waking up for window' : this.afterExit === 'Bookshelf' ? 'Waking up for reading' : 'Waking up';
    if (this.sleeping?.phase === 'sleep') return 'Sleeping';
    if (this.sleeping?.phase === 'settle') return 'Settle into bed';
    if (this.targetKind === 'Bed') return 'Walk to bed';
    if (isRoomId(this.targetKind)) {
      return this.currentState === 'Observe' ? `Visit ${this.targetKind}` : `Walk to ${this.targetKind}`;
    }
    if (this.currentState === 'Observe') return 'Observe environment';
    if (this.currentState === 'Walk') return this.commandActive ? 'Walk to window' : 'Autonomous walk';
    return 'Autonomous idle';
  }
  requestWindowObserve(): boolean {
    if (this.commandActive) return false;
    if (this.exitFor('Window')) return true;
    this.clearDaily();
    this.commandActive = true;
    this.targetKind = 'Window';
    this.arrivalSettle = 0;
    this.destination = this.layout.windowPosition.clone();
    this.currentState = 'Walk';
    this.observeTime = 0;
    this.routePastBed();
    return true;
  }
  requestSleep(): boolean {
    if (!this.layout.bed || this.commandActive || this.targetKind === 'Bed') return false;
    if (this.exitFor('Bed')) return true;
    this.beginSleep(true);
    return true;
  }
  requestRead(): boolean {
    if (!this.layout.reading || this.commandActive || this.targetKind === 'Bookshelf') return false;
    if (this.exitFor('Bookshelf')) return true;
    this.beginRead(true);
    return true;
  }
  requestEat(): boolean {
    if (!this.layout.dining || this.commandActive || this.targetKind === 'Food') return false;
    if (this.exitFor('Food')) return true;
    this.beginEat(true);
    return true;
  }
  requestClean(): boolean { return this.requestDaily('Clean'); }
  requestPlay(): boolean { return this.layout.connectedRooms ? this.requestLivingAction('Exercise') : this.requestDaily('Play'); }
  requestLivingAction(kind: LivingAction): boolean {
    if (!this.layout.connectedRooms || !isLivingAction(kind) || this.commandActive || this.living?.kind === kind) return false;
    if (this.exitFor(kind)) return true;
    this.beginLiving(kind, true);
    return true;
  }
  private beginLiving(kind: LivingAction, player: boolean) {
    this.clearDaily();
    this.living = new LivingActivity(kind);
    this.commandActive = player; this.targetKind = kind;
    this.destination = this.living.destination.clone(); this.arrivalSettle = 0;
    this.currentState = 'Walk'; this.routePastBed();
  }
  requestGardenAction(kind: GardenAction): boolean {
    if (!this.layout.balcony || !isGardenAction(kind) || this.commandActive || this.garden?.kind === kind) return false;
    if (this.exitFor(kind)) return true;
    this.beginGarden(kind, true); return true;
  }
  private beginGarden(kind: GardenAction, player: boolean) {
    this.clearDaily();
    this.garden = new GardenActivity(kind); this.commandActive = player; this.targetKind = kind;
    this.destination = this.garden.destination.clone(); this.arrivalSettle = 0;
    this.currentState = 'Walk'; this.routePastBed();
  }
  requestKitchenAction(kind: KitchenAction): boolean {
    if (!this.layout.kitchen || !isKitchenAction(kind) || this.commandActive || this.kitchen?.kind === kind) return false;
    if (this.exitFor(kind)) return true;
    this.beginKitchen(kind, true); return true;
  }
  private beginKitchen(kind: KitchenAction, player: boolean) {
    this.clearDaily();
    this.kitchen = new KitchenActivity(kind); this.commandActive = player; this.targetKind = kind;
    this.destination = this.kitchen.destination.clone(); this.arrivalSettle = 0;
    this.currentState = 'Walk'; this.routePastBed();
  }
  requestRoomVisit(room: RoomId): boolean {
    if (!this.layout.connectedRooms || this.commandActive || !isRoomId(room) || room === 'Balcony' && !this.layout.balcony) return false;
    if (room === 'Kitchen' && !this.layout.kitchen) return false;
    if (this.exitFor(room)) return true;
    this.clearDaily();
    this.commandActive = true;
    this.targetKind = room;
    this.destination = new THREE.Vector3(homeRooms[room].centerX, 0, room === 'Bedroom' ? .25 : room === 'LivingRoom' ? 6.2 : homeRooms[room].centerZ);
    this.arrivalSettle = this.observeTime = 0;
    this.currentState = 'Walk';
    this.routePastBed();
    return true;
  }
  private requestDaily(kind: 'Clean' | 'Play') {
    if (!this.layout.leisure || this.commandActive || this.dailyKind === kind) return false;
    if (this.exitFor(kind)) return true;
    this.beginDaily(kind, true);
    return true;
  }
  private clearDaily() {
    this.kitchen = null;
    this.garden = null;
    this.living = null;
    this.eating = null;
    this.reading = null;
    this.sleeping = null;
    this.dailyKind = this.dailyPhase = null;
    this.dailyPose = this.dailyTime = this.dailyMotionTime = 0;
  }
  private beginDaily(kind: DailyKind, player: boolean) {
    this.clearDaily();
    this.commandActive = player;
    this.dailyKind = kind;
    this.arrivalSettle = 0;
    if (kind === 'Stretch') {
      this.destination = null;
      this.targetKind = null;
      this.dailyPhase = 'settle';
      this.currentState = 'Stretch';
    } else {
      this.destination = (kind === 'Clean' ? this.layout.leisure!.storage.position : this.layout.leisure!.play).clone();
      this.targetKind = kind;
      this.dailyPhase = 'approach';
      this.currentState = 'Walk';
      this.routePastBed();
    }
  }
  private finishDaily() {
    if (this.dailyPhase === 'finish') return;
    if (this.dailyKind === 'Clean' && this.dailyPhase !== 'settle') {
      if (this.dailyPhase === 'return') return;
      this.dailyPhase = 'return';
      this.dailyTime = 0;
      this.destination = this.layout.leisure!.storage.position.clone();
      this.currentState = 'Walk';
      this.arrivalSettle = 0;
      this.routePastBed();
      return;
    }
    this.dailyFinishFrom = this.dailyPose;
    this.dailyPhase = 'finish';
    this.dailyTime = 0;
    this.currentState = this.dailyKind!;
  }
  private beginEat(player: boolean) {
    this.clearDaily();
    this.commandActive = player;
    this.targetKind = 'Food';
    this.eating = new EatActivity(this.layout.dining!);
    this.destination = this.eating.destination.clone();
    this.arrivalSettle = 0;
    this.currentState = 'Walk';
    this.routePastBed();
  }
  private exitFor(target: NonNullable<Character['afterExit']>) {
    if (this.kitchen && (this.kitchen.phase !== 'approach' || this.root.position.x > 4.2 && this.root.position.z < 5.65)) {
      this.commandActive = true; this.afterExit = target;
      this.kitchen.finish(); this.currentState = 'Living'; return true;
    }
    if (this.garden && this.garden.phase !== 'approach' && this.garden.pose > 0) {
      this.commandActive = true; this.afterExit = target;
      this.garden.finish(); this.currentState = 'Living'; return true;
    }
    if (this.living && this.living.phase !== 'approach') {
      this.commandActive = true; this.afterExit = target;
      this.living.finish(); this.currentState = 'Living';
      // A cup already on its way back must keep walking toward its table.
      if (this.living.phase === 'return') this.currentState = 'Walk';
      return true;
    }
    const sleepPose = this.sleeping?.pose ?? 0, readPose = this.reading?.pose ?? 0, eatPose = this.eating?.pose ?? 0;
    if (sleepPose <= 0 && readPose <= 0 && eatPose <= 0 && this.dailyPose <= 0) return false;
    this.commandActive = true;
    this.afterExit = target;
    if (sleepPose > 0) { this.sleeping!.finish(); this.currentState = 'Sleep'; }
    else if (readPose > 0) { this.reading!.finish(); this.currentState = 'Read'; }
    else if (eatPose > 0) { this.eating!.finish(); this.currentState = 'Eat'; }
    else this.finishDaily();
    return true;
  }
  private completeExit() {
    const next = this.afterExit;
    if (!next && this.sleeping?.phase === 'wake' && this.layout.leisure) this.stretchAfterWalk = true;
    this.afterExit = null;
    this.consecutiveWalks = 0;
    this.enterIdle();
    if (next === 'Window') this.requestWindowObserve();
    else if (next === 'Bed') this.requestSleep();
    else if (next === 'Bookshelf') this.requestRead();
    else if (next === 'Food') this.requestEat();
    else if (next === 'Clean') this.requestClean();
    else if (next === 'Play') this.requestPlay();
    else if (isRoomId(next)) this.requestRoomVisit(next);
    else if (isLivingAction(next)) this.requestLivingAction(next);
    else if (isGardenAction(next)) this.requestGardenAction(next);
    else if (isKitchenAction(next)) this.requestKitchenAction(next);
  }
  private beginRead(player: boolean) {
    this.clearDaily();
    this.readingCount++;
    this.commandActive = player;
    this.targetKind = 'Bookshelf';
    // Every other read in the daily-life home nods off once.
    this.reading = new ReadActivity(this.layout.reading!, !!this.layout.leisure && this.readingCount % 2 === 1);
    this.destination = this.reading.destination.clone();
    this.arrivalSettle = 0;
    this.currentState = 'Walk';
    this.routePastBed();
  }
  private beginSleep(player: boolean) {
    this.clearDaily();
    this.commandActive = player;
    this.targetKind = 'Bed';
    this.sleeping = new SleepActivity(this.layout.bed!);
    this.destination = this.sleeping.destination.clone();
    this.arrivalSettle = 0;
    this.currentState = 'Walk';
    this.routePastBed();
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
    this.clearDaily();
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
    this.elapsed += dt;
    this.sleepCooldown = Math.max(0, this.sleepCooldown - dt);
    this.readCooldown = Math.max(0, this.readCooldown - dt);
    this.eatCooldown = Math.max(0, this.eatCooldown - dt);
    this.cleanCooldown = Math.max(0, this.cleanCooldown - dt);
    this.playCooldown = Math.max(0, this.playCooldown - dt);
    for (const [kind, cooldown] of this.livingCooldowns) this.livingCooldowns.set(kind, Math.max(0, cooldown - dt));
    for (const [kind, cooldown] of this.gardenCooldowns) this.gardenCooldowns.set(kind, Math.max(0, cooldown - dt));
    for (const [kind, cooldown] of this.kitchenCooldowns) this.kitchenCooldowns.set(kind, Math.max(0, cooldown - dt));
    let moved = 0;
    let lookHeading = this.root.rotation.y;
    const previousHeading = this.root.rotation.y;
    if (this.kitchen && this.currentState === 'Living') {
      if (this.kitchen.update(dt)) { this.kitchenCooldowns.set(this.kitchen.kind, 70); this.completeExit(); }
      else if (this.kitchen.phase === 'retreat') {
        moved = Math.min(.7 * dt, Math.max(0, 5.65 - this.root.position.z));
        this.root.position.z += moved;
      }
    } else if (this.garden && this.currentState === 'Living') {
      if (this.garden.update(dt)) { this.gardenCooldowns.set(this.garden.kind, 65); this.completeExit(); }
    } else if (this.living && this.currentState === 'Living') {
      const result = this.living.update(dt);
      if (result === 'move') {
        this.destination = this.living.destination.clone(); this.arrivalSettle = 0;
        this.currentState = 'Walk'; this.routePastBed();
      } else if (result === 'done') {
        this.livingCooldowns.set(this.living.kind, 45); this.completeExit();
      }
    } else if (this.dailyKind && (this.dailyPhase === 'settle' || this.dailyPhase === 'active' || this.dailyPhase === 'finish')) {
      this.dailyTime += dt;
      if (this.dailyPhase === 'settle') {
        const duration = this.dailyKind === 'Clean' ? DAILY.Clean.settle : DAILY.settle;
        this.dailyPose = Math.min(1, this.dailyTime / duration);
        if (this.dailyTime >= duration) {
          this.dailyTime = 0;
          if (this.dailyKind === 'Clean') {
            this.dailyPhase = 'carry'; this.currentState = 'Walk';
            this.destination = this.layout.leisure!.clean.clone(); this.arrivalSettle = 0;
            this.routePastBed();
          } else { this.dailyPhase = 'active'; this.currentState = this.dailyKind; }
        }
      } else if (this.dailyPhase === 'active') {
        this.dailyMotionTime = Math.min(this.dailyTime, DAILY[this.dailyKind].duration);
        if (this.dailyTime >= DAILY[this.dailyKind].duration) this.finishDaily();
      } else {
        const duration = this.dailyKind === 'Clean' ? DAILY.Clean.finish : DAILY.finish;
        this.dailyPose = this.dailyFinishFrom * (1 - Math.min(1, this.dailyTime / duration));
        if (this.dailyTime >= duration) {
          if (this.dailyKind === 'Clean') this.cleanCooldown = DAILY.Clean.cooldown;
          if (this.dailyKind === 'Play') this.playCooldown = DAILY.Play.cooldown;
          this.completeExit();
        }
      }
    } else if (this.eating && this.eating.phase !== 'approach') {
      // Settle keeps the arrival Walk state; bites and finish read as Eat.
      if (this.eating.update(dt)) { this.eatCooldown = EAT.cooldown; this.completeExit(); }
      else if (this.eating.phase !== 'settle') this.currentState = 'Eat';
    } else if (this.reading && this.reading.phase !== 'approach') {
      // Opening the book keeps the arrival Walk state, like settling at the table.
      if (this.reading.update(dt)) { this.readCooldown = READ.cooldown; this.completeExit(); }
      else if (this.reading.phase !== 'settle') this.currentState = 'Read';
    } else if (this.sleeping && this.sleeping.phase !== 'approach') {
      // Settling into bed keeps the arrival Walk state; sleeping and waking read as Sleep.
      if (this.sleeping.update(dt)) { this.sleepCooldown = SLEEP.cooldown; this.completeExit(); }
      else if (this.sleeping.phase !== 'settle') this.currentState = 'Sleep';
    } else if (this.currentState === 'Idle') {
      this.idleRemaining -= dt;
      if (this.idleRemaining <= 0) {
        const eligible: Array<'Bed' | 'Bookshelf' | 'Food' | 'Clean' | 'Play' | LivingAction | GardenAction | KitchenAction> = [];
        if (this.completedWalk && this.layout.bed && this.sleepCooldown === 0) eligible.push('Bed');
        if (this.completedWalk && this.layout.reading && this.readCooldown === 0) eligible.push('Bookshelf');
        if (this.completedWalk && this.layout.dining && this.eatCooldown === 0) eligible.push('Food');
        if (this.completedWalk && this.layout.leisure && this.cleanCooldown === 0) eligible.push('Clean');
        if (!this.layout.connectedRooms && this.completedWalk && this.layout.leisure && this.playCooldown === 0) eligible.push('Play');
        if (this.layout.connectedRooms && this.completedWalk) {
          for (const kind of livingActions) if (!(this.livingCooldowns.get(kind) ?? 0)) eligible.push(kind);
        }
        if (this.layout.balcony && this.completedWalk) {
          for (const kind of gardenActions) if (!(this.gardenCooldowns.get(kind) ?? 0)) eligible.push(kind);
        }
        if (this.layout.kitchen && this.completedWalk) {
          for (const kind of kitchenActions) if (!(this.kitchenCooldowns.get(kind) ?? 0)) eligible.push(kind);
        }
        // Enabled life actions have weight 1; Walk has weight 3.
        const choice = eligible.length && !this.stretchAfterWalk ? Math.floor(this.random() * (eligible.length + (this.consecutiveWalks >= 3 ? 0 : SLEEP.walkWeight))) : -1;
        if (eligible[choice] === 'Bed') this.beginSleep(false);
        else if (eligible[choice] === 'Bookshelf') this.beginRead(false);
        else if (eligible[choice] === 'Food') this.beginEat(false);
        else if (eligible[choice] === 'Clean') this.beginDaily('Clean', false);
        else if (eligible[choice] === 'Play') this.beginDaily('Play', false);
        else if (isLivingAction(eligible[choice])) this.beginLiving(eligible[choice] as LivingAction, false);
        else if (isGardenAction(eligible[choice])) this.beginGarden(eligible[choice] as GardenAction, false);
        else if (isKitchenAction(eligible[choice])) this.beginKitchen(eligible[choice] as KitchenAction, false);
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
        lookHeading = this.kitchen ? this.kitchen.heading : this.garden ? this.garden.heading : this.living ? this.living.heading : this.sleeping ? this.sleeping.heading
          : this.reading ? this.reading.heading
          : this.eating ? this.eating.heading
          : this.targetKind === 'Clean' && this.dailyPhase !== 'carry' ? this.layout.leisure!.storage.heading
          : this.targetKind === 'Clean' || this.targetKind === 'Play' ? this.layout.leisure!.heading
          : this.targetKind === 'LivingRoom' ? 0 : this.layout.windowHeading;
        this.speed = 0;
        if (this.corner) this.corner = this.route.shift() ?? null;
        else if (this.targetKind === 'Room') {
          this.completedWalk = true;
          this.roomWalkCount++;
          this.enterIdle();
          if (this.layout.leisure && (this.stretchAfterWalk || this.roomWalkCount % 4 === 0)) {
            this.stretchAfterWalk = false;
            this.beginDaily('Stretch', false);
          }
        }
        else if (this.turnTo(lookHeading, dt) <= 0.025) {
          // A short foreground settle belongs to the existing approach, not a new State.
          this.arrivalSettle += dt;
          if (this.arrivalSettle >= 0.18) {
            if (this.kitchen) { this.kitchen.arrive(); this.currentState = 'Living'; }
            else if (this.garden) { this.garden.arrive(); this.currentState = 'Living'; }
            else if (this.living) { this.living.arrive(); this.currentState = 'Living'; }
            else if (this.sleeping) this.sleeping.arrive();
            else if (this.reading) this.reading.arrive();
            else if (this.eating) this.eating.arrive();
            else if (this.targetKind === 'Clean' && this.dailyPhase === 'carry') {
              this.dailyPhase = 'active'; this.dailyTime = this.dailyMotionTime = 0; this.currentState = 'Clean';
            } else if (this.targetKind === 'Clean' && this.dailyPhase === 'return') {
              this.dailyFinishFrom = this.dailyPose; this.dailyPhase = 'finish'; this.dailyTime = 0; this.currentState = 'Clean';
            } else if (this.targetKind === 'Clean' || this.targetKind === 'Play') { this.dailyPhase = 'settle'; this.dailyTime = 0; }
            else { this.currentState = 'Observe'; this.observeTime = 0; }
          }
        }
      } else {
        lookHeading = Math.atan2(this.direction.x, this.direction.z);
        const angle = this.turnTo(lookHeading, dt);
        // Continuously feed forward motion into the turn; never travel sideways or backwards.
        const alignment = Math.pow(Math.max(0, Math.cos(angle)), 3);
        const desiredSpeed = Math.min(1.05, distance * 2.6) * alignment;
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
    const cleanMode = this.dailyKind !== 'Clean' ? undefined : this.dailyPhase === 'settle' ? 'pickup' :
      this.dailyPhase === 'active' ? 'sweep' : this.dailyPhase === 'finish' ? 'stow' : 'carry';
    const cleanPark = this.dailyKind === 'Clean' ? this.layout.leisure!.storage.tool.clone().sub(this.root.position)
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
      dailyKind: this.dailyKind, dailyPose: this.dailyPose, dailyTime: this.dailyMotionTime, dozePose: this.dozePose,
      cleanMode, cleanPark, cleanParkYaw: -this.root.rotation.y, living: this.living, garden: this.garden, kitchen: this.kitchen });
  }
}
