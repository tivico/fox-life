import * as THREE from 'three';

export type PetReaction = 'nuzzle' | 'glance' | 'twitch' | 'shy';
/** Pet-only timing: a tap is a short reaction layered on the current activity, never a new intent. */
export const PET = {
  burstWindow: 8, shyAfter: 5,
  duration: { nuzzle: 1.6, glance: 1.3, twitch: 1.1, shy: 3 },
} as const;
export const petFeedback: Record<PetReaction, string> = {
  nuzzle: '牠把頭靠過來，瞇起眼睛，很舒服的樣子。',
  glance: '牠抬頭看了你一眼，又繼續手邊的事。',
  twitch: '耳朵抖了抖，牠還在夢裡。',
  shy: '摸太多次了，牠害羞地把頭轉開。',
};
export interface PetSnapshot { kind: PetReaction; time: number }

// Additive joint offsets for one reaction; they ease in, hold, and ease out before the reaction ends.
export function petPose({ kind, time }: PetSnapshot) {
  const step = THREE.MathUtils.smootherstep;
  const duration = PET.duration[kind];
  const s = step(time, 0, .25) * (1 - step(time, duration - .45, duration));
  const pose = { headX: 0, headY: 0, headZ: 0, bodyZ: 0, eyes: 1, earX: [0, 0], earZ: [0, 0], tailYaw: 0, tailPitch: 0 };
  if (kind === 'nuzzle') {
    // Lean into the hand with closed eyes and a quick tail wag.
    pose.headZ = .22 * s; pose.headX = -.10 * s; pose.bodyZ = .04 * s; pose.eyes = 1 - .85 * s;
    pose.earX = [-.25 * s, -.25 * s]; pose.tailYaw = Math.sin(time * 9) * .32 * s;
  } else if (kind === 'glance') {
    // Look up from the current task with perked ears, then carry on.
    pose.headX = -.24 * s; pose.headY = .16 * s; pose.earX = [.22 * s, .22 * s]; pose.eyes = 1 + .1 * s;
  } else if (kind === 'twitch') {
    // Asleep: only one ear flicks and the tail tip stirs; eyes stay closed.
    const flick = Math.sin(time * 26) * step(time, 0, .08) * (1 - step(time, .35, .7));
    pose.earX = [flick * .30, flick * .12]; pose.earZ = [flick * .10, 0]; pose.tailPitch = Math.sin(time * 7) * .04 * s;
  } else {
    // Too many taps: turn the head away, ears back, tail curled in.
    pose.headY = -.55 * s; pose.headX = .12 * s; pose.earX = [-.45 * s, -.45 * s]; pose.eyes = 1 - .4 * s; pose.tailYaw = -.4 * s;
  }
  return pose;
}
