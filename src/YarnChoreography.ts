import * as THREE from 'three';

export const YARN_TAPS = [.6, 1.8, 3, 4.2, 5.4, 6.6] as const;

/** Anticipate, tap, roll, pause: the ball only rotates when it actually travels. */
export function createYarnChoreography() {
  const root = new THREE.Group();
  const nodes = ['ball', 'left', 'right'].map(name => { const node = new THREE.Group(); node.name = name; root.add(node); return node; });
  const ball: Array<[number, number]> = [[0, 0]];
  const left: Array<[number, number]> = [[0, 0]], right: Array<[number, number]> = [[0, 0]];
  let previous = 0;
  YARN_TAPS.forEach((tap, i) => {
    const next = (i % 2 ? 1 : -1) * [.31, .34, .29, .33, .28, .24][i]!;
    ball.push([tap, previous]);
    for (let frame = 1; frame <= 12; frame++) {
      const u = frame / 12;
      ball.push([tap + .48 * u, THREE.MathUtils.lerp(previous, next, THREE.MathUtils.smootherstep(u, 0, 1))]);
    }
    ball.push([tap + .75, next]); previous = next;
    const paw = i % 2 ? left : right;
    paw.push([tap - .28, 0], [tap - .08, .6], [tap + .04, 1], [tap + .27, 0]);
  });
  ball.push([7.6, previous]); left.push([7.6, 0]); right.push([7.6, 0]);
  const clip = new THREE.AnimationClip('YarnPlay', 7.6, [ball, left, right].map((keys, i) =>
    new THREE.NumberKeyframeTrack(`${nodes[i]!.name}.position[x]`, keys.map(k => k[0]), keys.map(k => k[1]), i === 0 ? THREE.InterpolateLinear : THREE.InterpolateSmooth)));
  const mixer = new THREE.AnimationMixer(root), action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
  return {
    sample(time: number) {
      action.paused = false; action.enabled = true;
      mixer.setTime(THREE.MathUtils.clamp(time, 0, 7.6));
      return { x: nodes[0]!.position.x, left: THREE.MathUtils.clamp(nodes[1]!.position.x, 0, 1),
        right: THREE.MathUtils.clamp(nodes[2]!.position.x, 0, 1) };
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
