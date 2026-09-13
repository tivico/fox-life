import * as THREE from 'three';
import { createFoxVisual } from './createFoxVisual.ts';

export type CharacterState = 'Idle' | 'Walk' | 'Observe';
export type IdleVariation = 'Breathe' | 'Look around';
export interface CharacterLayout {
  windowPosition: THREE.Vector3;
  windowHeading: number;
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
  private readonly direction = new THREE.Vector3();
  private readonly layout: CharacterLayout;
  private readonly random: () => number;

  constructor(layout: CharacterLayout, random: () => number = Math.random) {
    this.layout = { ...layout, windowPosition: layout.windowPosition.clone(), bounds: { ...layout.bounds } };
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
  get action() {
    if (this.currentState === 'Observe') return 'Observe environment';
    if (this.currentState === 'Walk') return this.commandActive ? 'Walk to window' : 'Autonomous walk';
    return 'Autonomous idle';
  }
  requestWindowObserve(): boolean {
    if (this.commandActive) return false;
    this.commandActive = true;
    this.destination = this.layout.windowPosition.clone();
    this.currentState = 'Walk';
    this.observeTime = 0;
    return true;
  }
  private nextIdleDuration() { return 2.5 + this.random() * 2.7; }
  private enterIdle() {
    this.currentState = 'Idle';
    this.commandActive = false;
    this.destination = null;
    this.observeTime = 0;
    this.speed = 0;
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
    this.root.rotation.y += THREE.MathUtils.clamp(difference, -TURN_SPEED * dt, TURN_SPEED * dt);
    return Math.abs(angleDifference(heading, this.root.rotation.y));
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    let moved = 0;
    if (this.currentState === 'Idle') {
      this.idleRemaining -= dt;
      if (this.idleRemaining <= 0) {
        this.destination = this.chooseDestination();
        this.currentState = 'Walk';
      }
    } else if (this.currentState === 'Walk' && this.destination) {
      this.direction.subVectors(this.destination, this.root.position);
      const distance = this.direction.length();
      if (distance <= ARRIVAL_DISTANCE) {
        this.speed = 0;
        if (!this.commandActive) this.enterIdle();
        else if (this.turnTo(this.layout.windowHeading, dt) <= 0.025) {
          this.currentState = 'Observe';
          this.observeTime = 0; // Start only after arrival AND facing.
        }
      } else {
        const angle = this.turnTo(Math.atan2(this.direction.x, this.direction.z), dt);
        const desiredSpeed = angle < 0.35 ? Math.min(1.05, distance * 3) : 0;
        this.speed = THREE.MathUtils.damp(this.speed, desiredSpeed, 9, dt);
        // Do not glide sideways when a command turns us away from the old route.
        moved = angle < 0.35 ? Math.min(this.speed * dt, distance) : 0;
        this.root.position.addScaledVector(this.direction, moved / distance);
      }
    } else if (this.currentState === 'Observe') {
      this.observeTime += dt;
      if (this.observeTime >= OBSERVE_SECONDS) this.enterIdle();
    }
    this.visual.animate({ dt, time: this.elapsed, distance: moved, state: this.currentState,
      variation: this.variation, observeTime: this.observeTime });
  }
}
