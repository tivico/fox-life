import * as THREE from 'three';
import { CUP_PARK, type LivingSnapshot } from './LivingActivity.ts';
import { createLivingArm } from './LivingArm.ts';

export const REMOTE_PARK = new THREE.Vector3(-2.85, .76, 6.15);
export function createTeaCup() {
  const group = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({ color: '#b98870', roughness: .9 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.075, .067, .14, 20, 1, true), clay); group.add(cup);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(.065, 20), new THREE.MeshStandardMaterial({ color: '#795a40', roughness: 1 }));
  tea.rotation.x = -Math.PI / 2; tea.position.y = .062; group.add(tea);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.041, .012, 6, 16), clay); handle.position.x = .082; group.add(handle);
  return group;
}
export function createRemote() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#555e54', roughness: 1 });
  group.add(new THREE.Mesh(new THREE.BoxGeometry(.085, .027, .19), dark));
  for (const z of [-.055, -.005, .045]) {
    const key = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshStandardMaterial({ color: z < -.05 ? '#bd8c70' : '#d5d8be', roughness: 1 }));
    key.position.set(0, .018, z); group.add(key);
  }
  return group;
}

export function createLivingVisual(joints: { root: THREE.Group; body: THREE.Group; head: THREE.Group; eyes: THREE.Group;
  arms: THREE.Group[]; legs: THREE.Group[]; tail: THREE.Group }) {
  const { root, body, head, eyes, arms, legs, tail } = joints;
  const armBends = arms.map((arm, i) => createLivingArm(arm, i ? 1 : -1));
  function reachArm(index: number, target: THREE.Vector3, hint: THREE.Vector3, amount: number) {
    body.updateWorldMatrix(true, false);
    armBends[index]!.pose(body.localToWorld(target), body.localToWorld(hint), amount);
  }
  const cup = createTeaCup(); cup.name = 'HeldTeaCup'; root.add(cup);
  const remote = createRemote(); remote.name = 'HeldRemote'; root.add(remote);
  const props = [cup, remote];
  for (const prop of props) {
    prop.visible = false; prop.scale.setScalar(0);
    prop.traverse(object => { if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.raycast = function(raycaster, hits) { if (prop.visible) THREE.Mesh.prototype.raycast.call(this, raycaster, hits); };
    } });
  }
  let saved: Array<{ object: THREE.Object3D; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }> = [];
  const blend = THREE.MathUtils.smootherstep;
  function hold(prop: THREE.Group, park: THREE.Vector3, amount: number, scale: number, tilt = 0) {
    root.updateWorldMatrix(true, true);
    const hand = arms[1]!.localToWorld(new THREE.Vector3(.05, -.34, .07));
    const position = park.clone().lerp(hand, amount);
    prop.position.copy(root.worldToLocal(position));
    prop.scale.setScalar(scale); prop.rotation.set(0, 0, tilt);
    prop.visible = true;
  }
  return {
    restore() {
      armBends.forEach(arm => arm.restore());
      for (const pose of saved) { pose.object.position.copy(pose.position); pose.object.rotation.copy(pose.rotation); pose.object.scale.copy(pose.scale); }
      saved = []; props.forEach(prop => { prop.visible = false; prop.scale.setScalar(0); });
    },
    animate(activity: LivingSnapshot | null) {
      if (!activity) return;
      const { kind, phase, pose, motionTime: t } = activity;
      saved = [root, body, head, eyes, ...arms, ...legs, tail].map(object => ({ object,
        position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone() }));
      const p = blend(pose, 0, 1);
      const seated = ['WatchTV', 'SofaRest', 'Tea', 'Music'].includes(kind);
      if (seated && p > 0) {
        // Lift and curl the tail first, then slide back onto the existing cushion.
        root.position.y += .505 * blend(pose, 0, .6) + .1 * Math.sin(Math.PI * p);
        root.position.z -= 1.15 * (root.scale.x / .76) * blend(pose, .3, 1);
        body.rotation.x += (-.08 - body.rotation.x) * p;
        tail.rotation.y += (1.5 - tail.rotation.y) * blend(pose, 0, .45);
        tail.rotation.x += (-.18 - tail.rotation.x) * p;
        // Keep the smaller fox's fuller tail above the cushion, still overlapping its hip socket.
        tail.position.y += Math.max(0, .76 - root.scale.x) * p;
        for (const [i, leg] of legs.entries()) {
          leg.rotation.x -= .85 * p;
          leg.position.y += .167 * p; leg.position.z += (.40 + Math.sin(t * 2.3 + i * Math.PI) * .025) * p;
        }
        arms.forEach(arm => { arm.rotation.x += (-.72 - arm.rotation.x) * p; });
      }
      if (kind === 'WatchTV') {
        const clickTime = phase === 'finish' ? activity.elapsed : t;
        const press = blend(clickTime, .1, .35) * (1 - blend(clickTime, .65, .95));
        if (activity.remote !== false) arms[1]!.rotation.x += (-1.3 - .2 * press - arms[1]!.rotation.x) * p;
        head.rotation.y += (-.04 + Math.sin(t * .65) * .045 - head.rotation.y) * p;
        head.rotation.z += Math.sin(t * .8) * .045 * p;
        eyes.scale.y *= 1 - Math.pow(Math.max(0, Math.sin(t * .9)), 12) * .35 * p;
        if (pose > .55 && activity.remote !== false) hold(remote, REMOTE_PARK, blend(pose, .55, .95), 1 / .76);
      } else if (kind === 'SofaRest') {
        body.rotation.z += .1 * p; head.rotation.z += .1 * p;
        head.rotation.x -= .08 * p;
        eyes.scale.y *= 1 - .65 * p;
        arms[0]!.rotation.z -= .25 * p;
      } else if (kind === 'Tea') {
        let sip = 0;
        for (const start of [.6, 3.8, 6.6]) sip += blend(t - start, 0, .65) * (1 - blend(t - start, 1.1, 1.7));
        const carrying = phase !== 'approach';
        if (carrying) {
          const raisedTail = phase === 'pickup' ? blend(activity.elapsed, 0, .65)
            : phase === 'putdown' ? 1 - blend(activity.elapsed, .4, 1.1) : 1;
          const carryTail = raisedTail * (1 - p);
          // Keep the brush behind the spine instead of pitching it through the head.
          tail.rotation.x += (.45 - tail.rotation.x) * carryTail;
          tail.position.z -= .12 * carryTail;
          tail.position.y += .07 * carryTail;
          const lift = p * sip;
          const reach = phase === 'pickup' || phase === 'putdown'
            ? blend(activity.elapsed, 0, .25) * (1 - blend(activity.elapsed, .8, 1.1)) : 0;
          const reachLift = blend(reach, 0, .6);
          root.position.z += .24 * reach; root.position.y += .1 * reach;
          legs.forEach(leg => { leg.position.y -= .1 / .76 * reach; });
          body.rotation.x += .08 * reach;
          arms[1]!.rotation.x = -1.05 - .85 * Math.max(lift, reachLift);
          arms[1]!.position.z += .12 * lift + .28 * reach * (1 - activity.cupHold);
          arms[1]!.position.y += .12 * reachLift;
          arms[1]!.rotation.z += (-.7 - arms[1]!.rotation.z) * reachLift;
          head.rotation.x += .12 * lift;
          hold(cup, CUP_PARK, activity.cupHold, 1 / .76, -.1 * lift);
        }
      } else if (kind === 'Exercise' && p > 0) {
        if (t < 3.6) {
          const raise = Math.sin(Math.PI * (t % 1.8) / 1.8);
          const armPose = p * blend(raise, 0, .2);
          arms.forEach((arm, i) => {
            const side = i ? 1 : -1;
            arm.rotation.x *= 1 - armPose;
            reachArm(i, new THREE.Vector3(side * (.27 + .27 * raise), .50 + .49 * raise, .07),
              new THREE.Vector3(side * .55, .73, .02), armPose);
          });
          head.rotation.x -= .1 * raise * p;
        } else if (t < 7.2) {
          const side = Math.sin((t - 3.6) / 3.6 * Math.PI * 2);
          const stretch = blend(t, 3.6, 4.15) * (1 - blend(t, 6.65, 7.2));
          const armPose = p * blend(stretch, 0, .2);
          body.rotation.z += .19 * side * stretch * p;
          arms.forEach((arm, i) => {
            const sign = i ? 1 : -1;
            arm.rotation.x *= 1 - armPose;
            reachArm(i, new THREE.Vector3(sign * (.27 + .27 * stretch), .50 + .49 * stretch, .07),
              new THREE.Vector3(sign * .58, .72, 0), armPose);
          });
        } else {
          const march = Math.sin((t - 7.2) * Math.PI * 2);
          legs.forEach((leg, i) => { leg.position.y += Math.max(0, march * (i ? -1 : 1)) * .15 * p; });
          arms.forEach((arm, i) => { arm.rotation.x += (march * (i ? -.65 : .65) - arm.rotation.x) * p; });
          body.position.y += .012 * Math.abs(march) * p;
        }
      } else if (kind === 'Music' && p > 0) {
        body.rotation.z += Math.sin(t * Math.PI * 1.4) * .045 * p;
        head.rotation.z += Math.sin(t * Math.PI * 1.4 - .3) * .06 * p;
        eyes.scale.y *= 1 - .45 * p;
        legs[0]!.position.z += Math.max(0, Math.sin(t * Math.PI * 1.4)) * .06 * p;
      } else if (kind === 'TidySofa' && p > 0) {
        const pat = Math.max(0, Math.sin(t * Math.PI * 1.3));
        const armPose = blend(pose, 0, .55), reach = blend(pose, .55, 1);
        root.position.z += .80 * reach;
        head.rotation.x -= .10 * p;
        eyes.position.y -= .008 * p;
        arms.forEach((arm, i) => {
          const side = i ? 1 : -1;
          arm.rotation.x *= 1 - armPose;
          reachArm(i, new THREE.Vector3(side * (i ? .42 : .29), i ? .95 + .025 * pat : .63, i ? .245 - .018 * pat : .14),
            new THREE.Vector3(side * .45, .54, .14), armPose);
        });
      }
    },
  };
}
