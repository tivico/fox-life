import * as THREE from 'three';
import { createFoxVisual } from './createFoxVisual.ts';
import { SLEEP, type SleepPhase } from './sleep.ts';
import { READ, type ReadPhase } from './read.ts';
import { EAT, type EatPhase } from './eat.ts';

export type CharacterState = 'Idle' | 'Walk' | 'Observe' | 'Sleep' | 'Read' | 'Eat';
export type IdleVariation = 'Breathe' | 'Look around';
export interface CharacterLayout {
  windowPosition: THREE.Vector3;
  windowHeading: number;
  bed?: { position: THREE.Vector3; heading: number; corner: THREE.Vector3 };
  reading?: { position: THREE.Vector3; heading: number };
  dining?: { position: THREE.Vector3; heading: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
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
  private targetKind: 'Room' | 'Window' | 'Bed' | 'Bookshelf' | 'Food' | null = null;
  private bedPhase: SleepPhase | null = null;
  private bedTime = 0;
  private bedPose = 0;
  private wakeFrom = 1;
  private sleepCooldown = 0;
  private completedWalk = false;
  private consecutiveWalks = 0;
  private corner: THREE.Vector3 | null = null;
  // One replacement during a safe exit, shared by the actual anchored actions.
  private afterExit: 'Window' | 'Bed' | 'Bookshelf' | 'Food' | null = null;
  private readingPhase: ReadPhase | null = null;
  private readingTime = 0;
  private readingPose = 0;
  private finishFrom = 1;
  private readCooldown = 0;
  private diningPhase: EatPhase | null = null;
  private diningTime = 0;
  private diningPose = 0;
  private mealFinishFrom = 1;
  private mealMotionTime = 0;
  private eatCooldown = 0;
  private readonly direction = new THREE.Vector3();
  private readonly layout: CharacterLayout;
  private readonly random: () => number;

  constructor(layout: CharacterLayout, random: () => number = Math.random) {
    this.layout = { ...layout, windowPosition: layout.windowPosition.clone(), bounds: { ...layout.bounds } };
    if (layout.bed) this.layout.bed = { position: layout.bed.position.clone(), heading: layout.bed.heading, corner: layout.bed.corner.clone() };
    if (layout.reading) this.layout.reading = { position: layout.reading.position.clone(), heading: layout.reading.heading };
    if (layout.dining) this.layout.dining = { position: layout.dining.position.clone(), heading: layout.dining.heading };
    this.random = random;
    this.idleRemaining = this.nextIdleDuration();
    this.root.name = 'Character';
    this.root.add(this.visual.root);
  }
  get state() { return this.currentState; }
  get source() { return this.commandActive ? 'Player Command' : 'Autonomous'; }
  get target() { return this.destination?.clone() ?? null; }
  get idleVariation() { return this.variation; }
  get observeElapsed() { return this.observeTime; }
  get targetLabel() { return this.targetKind === 'Food' && this.diningPhase !== 'approach' ? 'DiningArea' : this.targetKind; }
  get sleepPhase() { return this.bedPhase; }
  get sleepElapsed() { return this.bedTime; }
  get sleepCooldownRemaining() { return this.sleepCooldown; }
  get readPhase() { return this.readingPhase; }
  get readElapsed() { return this.readingTime; }
  get readCooldownRemaining() { return this.readCooldown; }
  get eatPhase() { return this.diningPhase; }
  get eatElapsed() { return this.diningTime; }
  get eatCooldownRemaining() { return this.eatCooldown; }
  get action() {
    if (this.diningPhase === 'finish') return 'Finishing meal';
    if (this.diningPhase === 'eat') return 'Eating';
    if (this.diningPhase === 'settle') return 'Smelling food';
    if (this.targetKind === 'Food') return 'Walk to dining area';
    if (this.readingPhase === 'finish') return 'Putting book away';
    if (this.readingPhase === 'read') return 'Reading';
    if (this.readingPhase === 'settle') return 'Opening book';
    if (this.targetKind === 'Bookshelf') return 'Walk to reading area';
    if (this.bedPhase === 'wake') return this.afterExit === 'Window' ? 'Waking up for window' : this.afterExit === 'Bookshelf' ? 'Waking up for reading' : 'Waking up';
    if (this.bedPhase === 'sleep') return 'Sleeping';
    if (this.bedPhase === 'settle') return 'Settle into bed';
    if (this.targetKind === 'Bed') return 'Walk to bed';
    if (this.currentState === 'Observe') return 'Observe environment';
    if (this.currentState === 'Walk') return this.commandActive ? 'Walk to window' : 'Autonomous walk';
    return 'Autonomous idle';
  }
  requestWindowObserve(): boolean {
    if (this.commandActive) return false;
    if (this.exitFor('Window')) return true;
    this.bedPhase = null;
    this.readingPhase = null;
    this.diningPhase = null;
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
  private beginEat(player: boolean) {
    this.commandActive = player;
    this.bedPhase = this.readingPhase = null;
    this.targetKind = 'Food';
    this.destination = this.layout.dining!.position.clone();
    this.diningPhase = 'approach';
    this.diningTime = this.diningPose = this.mealMotionTime = this.arrivalSettle = 0;
    this.currentState = 'Walk';
    this.routePastBed();
  }
  private finishMeal() {
    if (this.diningPhase === 'finish') return;
    this.mealFinishFrom = this.diningPose;
    this.diningPhase = 'finish';
    this.diningTime = 0;
    this.currentState = 'Eat';
  }
  private exitFor(target: NonNullable<Character['afterExit']>) {
    if (this.bedPose <= 0 && this.readingPose <= 0 && this.diningPose <= 0) return false;
    this.commandActive = true;
    this.afterExit = target;
    if (this.bedPose > 0) this.beginWake();
    else if (this.readingPose > 0) this.beginFinish();
    else this.finishMeal();
    return true;
  }
  private completeExit() {
    const next = this.afterExit;
    this.afterExit = null;
    this.consecutiveWalks = 0;
    this.enterIdle();
    if (next === 'Window') this.requestWindowObserve();
    else if (next === 'Bed') this.requestSleep();
    else if (next === 'Bookshelf') this.requestRead();
    else if (next === 'Food') this.requestEat();
  }
  private beginRead(player: boolean) {
    this.diningPhase = null;
    this.commandActive = player;
    this.bedPhase = null;
    this.targetKind = 'Bookshelf';
    this.destination = this.layout.reading!.position.clone();
    this.readingPhase = 'approach';
    this.readingTime = this.readingPose = this.arrivalSettle = 0;
    this.currentState = 'Walk';
    this.routePastBed();
  }
  private beginFinish() {
    if (this.readingPhase === 'finish') return;
    this.finishFrom = this.readingPose;
    this.readingPhase = 'finish';
    this.readingTime = 0;
    this.currentState = 'Read';
  }
  private beginSleep(player: boolean) {
    this.diningPhase = null;
    this.commandActive = player;
    this.readingPhase = null;
    this.targetKind = 'Bed';
    this.destination = this.layout.bed!.position.clone();
    this.bedPhase = 'approach';
    this.bedTime = this.bedPose = this.arrivalSettle = 0;
    this.currentState = 'Walk';
    this.routePastBed();
  }
  private routePastBed() {
    const bed = this.layout.bed;
    // One room-specific bed-foot corner, never an intent queue or generic navigation.
    this.corner = bed && (this.targetKind === 'Bed' || this.root.position.x < -1.8)
      && this.root.position.distanceTo(this.destination!) > ARRIVAL_DISTANCE
      ? bed.corner.clone() : null;
    if (this.targetKind === 'Bed' && this.root.position.x < -1.8) this.corner = null;
  }
  private beginWake() {
    if (this.bedPhase === 'wake') return;
    this.wakeFrom = this.bedPose;
    this.bedPhase = 'wake';
    this.bedTime = 0;
    this.currentState = 'Sleep';
  }
  private nextIdleDuration() { return 2.5 + this.random() * 2.7; }
  private enterIdle() {
    this.currentState = 'Idle';
    this.commandActive = false;
    this.destination = null;
    this.targetKind = null;
    this.corner = null;
    this.bedPhase = null;
    this.bedPose = this.bedTime = 0;
    this.readingPhase = null;
    this.readingPose = this.readingTime = 0;
    this.diningPhase = null;
    this.diningPose = this.diningTime = this.mealMotionTime = 0;
    this.observeTime = 0;
    this.speed = 0;
    this.turnVelocity = 0;
    this.arrivalSettle = 0;
    this.idleRemaining = this.nextIdleDuration();
    this.variation = this.variation === 'Breathe' ? 'Look around' : 'Breathe';
  }
  private chooseDestination() {
    const b = this.layout.bounds;
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
    let moved = 0;
    let lookHeading = this.root.rotation.y;
    const previousHeading = this.root.rotation.y;
    if (this.diningPhase === 'settle' || this.diningPhase === 'eat' || this.diningPhase === 'finish') {
      this.diningTime += dt;
      if (this.diningPhase === 'settle') {
        this.diningPose = Math.min(1, this.diningTime / EAT.settle);
        if (this.diningTime >= EAT.settle) { this.diningPhase = 'eat'; this.diningTime = 0; this.currentState = 'Eat'; }
      } else if (this.diningPhase === 'eat') {
        this.mealMotionTime = Math.min(this.diningTime, EAT.duration);
        if (this.diningTime >= EAT.duration) this.finishMeal();
      } else {
        this.diningPose = this.mealFinishFrom * (1 - Math.min(1, this.diningTime / EAT.finish));
        if (this.diningTime >= EAT.finish) { this.eatCooldown = EAT.cooldown; this.completeExit(); }
      }
    } else if (this.readingPhase === 'settle' || this.readingPhase === 'read' || this.readingPhase === 'finish') {
      this.readingTime += dt;
      if (this.readingPhase === 'settle') {
        this.readingPose = Math.min(1, this.readingTime / READ.settle);
        if (this.readingTime >= READ.settle) { this.readingPhase = 'read'; this.readingTime = 0; this.currentState = 'Read'; }
      } else if (this.readingPhase === 'read') {
        if (this.readingTime >= READ.duration) this.beginFinish();
      } else {
        this.readingPose = this.finishFrom * (1 - Math.min(1, this.readingTime / READ.finish));
        if (this.readingTime >= READ.finish) {
          this.readCooldown = READ.cooldown;
          this.completeExit();
        }
      }
    } else if (this.bedPhase === 'settle' || this.bedPhase === 'sleep' || this.bedPhase === 'wake') {
      this.bedTime += dt;
      if (this.bedPhase === 'settle') {
        this.bedPose = THREE.MathUtils.clamp(this.bedTime / SLEEP.settle, 0, 1);
        if (this.bedTime >= SLEEP.settle) { this.bedPhase = 'sleep'; this.bedTime = 0; this.currentState = 'Sleep'; }
      } else if (this.bedPhase === 'sleep') {
        if (this.bedTime >= SLEEP.duration) this.beginWake();
      } else {
        this.bedPose = this.wakeFrom * (1 - THREE.MathUtils.clamp(this.bedTime / SLEEP.wake, 0, 1));
        if (this.bedTime >= SLEEP.wake) {
          this.sleepCooldown = SLEEP.cooldown;
          this.completeExit();
        }
      }
    } else if (this.currentState === 'Idle') {
      this.idleRemaining -= dt;
      if (this.idleRemaining <= 0) {
        const eligible: Array<'Bed' | 'Bookshelf' | 'Food'> = [];
        if (this.completedWalk && this.layout.bed && this.sleepCooldown === 0) eligible.push('Bed');
        if (this.completedWalk && this.layout.reading && this.readCooldown === 0) eligible.push('Bookshelf');
        if (this.completedWalk && this.layout.dining && this.eatCooldown === 0) eligible.push('Food');
        // Enabled life actions have weight 1; Walk has weight 3.
        const choice = eligible.length ? Math.floor(this.random() * (eligible.length + (this.consecutiveWalks >= 3 ? 0 : SLEEP.walkWeight))) : -1;
        if (eligible[choice] === 'Bed') this.beginSleep(false);
        else if (eligible[choice] === 'Bookshelf') this.beginRead(false);
        else if (eligible[choice] === 'Food') this.beginEat(false);
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
        lookHeading = this.targetKind === 'Bed' ? this.layout.bed!.heading
          : this.targetKind === 'Bookshelf' ? this.layout.reading!.heading
          : this.targetKind === 'Food' ? this.layout.dining!.heading : this.layout.windowHeading;
        this.speed = 0;
        if (this.corner) this.corner = null;
        else if (this.targetKind === 'Room') { this.completedWalk = true; this.enterIdle(); }
        else if (this.turnTo(lookHeading, dt) <= 0.025) {
          // A short foreground settle belongs to the existing approach, not a new State.
          this.arrivalSettle += dt;
          if (this.arrivalSettle >= 0.18) {
            if (this.targetKind === 'Bed') { this.bedPhase = 'settle'; this.bedTime = 0; }
            else if (this.targetKind === 'Bookshelf') { this.readingPhase = 'settle'; this.readingTime = 0; }
            else if (this.targetKind === 'Food') { this.diningPhase = 'settle'; this.diningTime = 0; }
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
          ['x', Math.min(b.minX, this.layout.windowPosition.x, this.layout.bed?.position.x ?? b.minX), Math.max(b.maxX, this.layout.windowPosition.x, this.layout.reading?.position.x ?? b.maxX, this.layout.dining?.position.x ?? b.maxX)],
          ['z', Math.min(b.minZ, this.layout.windowPosition.z), Math.max(b.maxZ, this.layout.windowPosition.z, this.layout.bed?.position.z ?? b.maxZ, this.layout.dining?.position.z ?? b.maxZ)],
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
    this.visual.animate({ dt, time: this.elapsed, distance: moved, state: this.currentState,
      variation: this.variation, observeTime: this.observeTime,
      turnRate: (this.root.rotation.y - previousHeading) / dt,
      headingError: this.currentState === 'Walk' ? angleDifference(lookHeading, this.root.rotation.y) : 0,
      preparingObserve: this.commandActive && this.currentState === 'Walk'
        && this.targetKind === 'Window' && !this.bedPhase && this.root.position.distanceTo(this.layout.windowPosition) < 0.14,
      sleepPose: this.bedPose, sleepPhase: this.bedPhase, sleepTime: this.bedTime,
      readPose: this.readingPose, readPhase: this.readingPhase, readTime: this.readingTime,
      eatPose: this.diningPose, eatTime: this.mealMotionTime });
  }
}
