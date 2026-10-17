import * as THREE from 'three';
import type { CleanMode, DailyKind } from './daily.ts';
import { createCleaningVisual } from './cleaning.ts';
import { createYarnChoreography } from './YarnChoreography.ts';
export { createBroom } from './cleaning.ts';

export function createYarnBall() {
  const ball = new THREE.Group();
  const yarn = new THREE.MeshStandardMaterial({ color: '#b97864', roughness: 1 });
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(.125, 16, 12), yarn));
  const thread = new THREE.MeshStandardMaterial({ color: '#dfb49b', roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.TorusGeometry(.122, .007, 4, 24), thread);
    line.rotation.set(i * .65, i * .9, i * .4); ball.add(line);
  }
  return ball;
}

export function createDailyVisual(joints: {
  root: THREE.Group; body: THREE.Group; head: THREE.Group; eyes: THREE.Group;
  arms: THREE.Group[]; legs: THREE.Group[]; tail: THREE.Group; book: THREE.Group; page: THREE.Group;
}) {
  const { root, body, head, eyes, arms, tail, book, page } = joints;
  const cleaning = createCleaningVisual(joints);
  const yarnMotion = createYarnChoreography();
  const ball = createYarnBall(); ball.name = 'PlayingYarn'; root.add(ball);
  const zzz = new THREE.Group(); zzz.name = 'ReadingDoze'; root.add(zzz);
  const zMaterial = new THREE.MeshStandardMaterial({ color: '#718567', roughness: 1 });
  for (let i = 0; i < 2; i++) {
    const letter = new THREE.Group(); letter.position.set(.1 + i * .13, 1.62 + i * .2, .08);
    for (const y of [-.05, .05]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.12, .018, .018), zMaterial);
      bar.position.y = y; letter.add(bar);
    }
    const diagonal = new THREE.Mesh(new THREE.BoxGeometry(.15, .018, .018), zMaterial);
    diagonal.rotation.z = Math.PI / 4; letter.add(diagonal); zzz.add(letter);
  }
  const props = [...cleaning.props, ball, zzz];
  for (const prop of props) {
    prop.visible = false; prop.scale.setScalar(0);
    prop.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.raycast = function(raycaster, hits) {
          if (prop.visible) THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
        };
      }
    });
  }
  // Restore only our final overlay before the existing animator removes its own overlays.
  let saved: Array<{ object: THREE.Object3D; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3; visible: boolean }> = [];
  const restore = () => {
    for (const pose of saved) {
      pose.object.position.copy(pose.position); pose.object.rotation.copy(pose.rotation); pose.object.scale.copy(pose.scale);
      pose.object.visible = pose.visible;
    }
    saved = [];
    for (const prop of props) { prop.visible = false; prop.scale.setScalar(0); prop.position.set(0, 0, 0); }
  };
  return {
    restore,
    dispose() { yarnMotion.dispose(); },
    animate(kind: DailyKind | null, pose: number, time: number, doze: number, dt: number,
      cleanMode: CleanMode = 'carry', cleanPark = new THREE.Vector3(), cleanParkYaw = 0) {
      if (kind !== 'Clean') cleaning.reset();
      if (pose <= 0 && doze <= 0) return;
      saved = [body, head, eyes, ...arms, ...joints.legs, ...arms.flatMap(arm => arm.children), tail, book, page].map(object => ({
        object, position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone(), visible: object.visible,
      }));
      if (doze > 0) {
        const nod = Math.sin(time * 3.3) * .025;
        head.rotation.x += (.14 + nod) * doze;
        head.rotation.z += .055 * doze;
        eyes.scale.y *= 1 - doze * .94;
        book.rotation.x += .05 * doze;
        page.rotation.z *= 1 - doze;
        zzz.visible = true; zzz.scale.setScalar(doze);
      }
      if (pose <= 0) return;
      const blend = THREE.MathUtils.smootherstep(pose, 0, 1);
      if (kind === 'Clean') {
        cleaning.animate(pose, time, cleanMode, cleanPark, cleanParkYaw, dt);
      } else if (kind === 'Play') {
        const phrase = yarnMotion.sample(time);
        const roll = phrase.x / .38;
        ball.visible = true; ball.scale.setScalar(blend);
        ball.position.set(phrase.x, .13, .65);
        ball.rotation.set(0, .1, -phrase.x / .125);
        head.rotation.x += .28 * blend; head.rotation.y += roll * .25 * blend;
        for (const [i, arm] of arms.entries()) {
          const reach = i === 0 ? phrase.left : phrase.right;
          arm.rotation.x += (-.65 - reach * .8 - arm.rotation.x) * blend;
          arm.rotation.z += (i === 0 ? -.1 : .1) * reach * blend;
          arm.position.z += .16 * reach * blend;
        }
        tail.rotation.y += (phrase.left - phrase.right) * .1 * blend;
      } else if (kind === 'Stretch') {
        const stretch = Math.sin(Math.min(1, time / 2.3) * Math.PI) * blend;
        body.scale.y *= 1 + stretch * .045;
        head.rotation.x -= .15 * stretch;
        eyes.scale.y *= 1 - stretch * .8;
        for (const [i, arm] of arms.entries()) {
          arm.rotation.x += (-2.75 - arm.rotation.x) * stretch;
          arm.rotation.z += (i === 0 ? .6 : -.6) * stretch;
          arm.position.x += (i === 0 ? -.07 : .07) * stretch;
        }
        tail.rotation.y += .12 * stretch;
      }
    },
  };
}
