import * as THREE from 'three';
import type { CharacterState } from './Character.ts';

type Channel = 'gaze' | 'nod' | 'earLeft' | 'earRight' | 'eyes';
type Keys = Array<[number, number]>;
const lengths = { Idle: 12, Walk: 4.8, Observe: 4, Sleep: 8, Read: 7, Eat: 6, Clean: 8.8, Play: 7.6, Stretch: 2.3 };
const rest: Record<Channel, number> = { gaze: 0, nod: 0, earLeft: 0, earRight: 0, eyes: 1 };
function blinks(duration: number, moments: number[]): Keys {
  return [[0, 1], ...moments.flatMap(t => [[t, 1], [t + .08, .12], [t + .18, 1]] as Keys), [duration, 1]];
}

/** Authored anticipation / hold / recovery curves on a pose carrier, never on limb geometry. */
export function foxPerformanceClips() {
  return Object.entries(lengths).map(([name, length]) => {
    const channels: Partial<Record<Channel, Keys>> = { eyes: blinks(length, length < 3 ? [] : [1.5, ...(length > 6 ? [5.4] : [])]) };
    if (name === 'Idle') {
      channels.gaze = [[0, 0], [1.8, 0], [2.4, -.15], [3.4, -.15], [4.2, 0], [8.1, 0], [8.6, .12], [9.8, .12], [10.6, 0], [12, 0]];
      channels.nod = [[0, 0], [4.7, 0], [5.6, .045], [6.8, 0], [12, 0]];
      channels.earLeft = [[0, 0], [7.1, 0], [7.18, -.12], [7.4, .025], [7.75, 0], [12, 0]];
      channels.earRight = [[0, 0], [7.23, 0], [7.32, -.09], [7.62, 0], [12, 0]];
    }
    if (name === 'Observe') {
      channels.gaze = [[0, 0], [.5, 0], [1.1, .22], [2.3, .22], [3.1, -.06], [3.7, 0], [4, 0]];
      channels.nod = [[0, 0], [.8, -.025], [2.6, -.025], [3.7, 0], [4, 0]];
      channels.earLeft = [[0, 0], [.4, -.065], [1.3, -.065], [2, 0], [4, 0]];
    }
    if (name === 'Read' || name === 'Clean') {
      channels.earLeft = [[0, 0], [.6, .055], [length - .5, .055], [length, 0]];
      channels.earRight = [[0, 0], [.8, .025], [length - .5, .025], [length, 0]];
    }
    if (name === 'Play' || name === 'Eat') {
      channels.earLeft = [[0, 0], [.3, -.08], [1.2, 0], [2.2, -.07], [3, 0], [length, 0]];
      channels.earRight = [[0, 0], [.5, -.045], [1.4, 0], [2.4, -.09], [3.2, 0], [length, 0]];
    }
    if (name === 'Stretch') channels.eyes = [[0, 1], [.45, .8], [1.1, .3], [1.55, .4], [2.1, 1], [2.3, 1]];
    const tracks = (Object.keys(rest) as Channel[]).map(channel => {
      const keys = channels[channel] ?? [[0, rest[channel]], [length, rest[channel]]];
      return new THREE.NumberKeyframeTrack(`${channel}.position[x]`, keys.map(k => k[0]), keys.map(k => k[1]), THREE.InterpolateSmooth);
    });
    return new THREE.AnimationClip(name, length, tracks);
  });
}

export function createFoxPerformance() {
  const carrier = new THREE.Group();
  const channels = Object.fromEntries((Object.keys(rest) as Channel[]).map(channel => {
    const node = new THREE.Group(); node.name = channel; node.position.x = rest[channel]; carrier.add(node); return [channel, node];
  })) as Record<Channel, THREE.Group>;
  const mixer = new THREE.AnimationMixer(carrier);
  const clips = foxPerformanceClips();
  const actions = new Map(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
  let previous: CharacterState | null = null;
  return {
    update(state: CharacterState, dt: number) {
      if (dt > 0 && Number.isFinite(dt)) {
        if (state !== previous) {
          if (previous) actions.get(previous)!.fadeOut(.28);
          actions.get(state)!.reset().setEffectiveWeight(1).fadeIn(previous ? .28 : 0).play();
          previous = state;
        }
        mixer.update(Math.min(dt, .05));
      }
      return { gaze: channels.gaze.position.x, nod: channels.nod.position.x,
        earLeft: channels.earLeft.position.x, earRight: channels.earRight.position.x,
        eyes: THREE.MathUtils.clamp(channels.eyes.position.x, .1, 1) };
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(carrier); },
  };
}
