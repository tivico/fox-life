import * as THREE from 'three';
import { CAN_PARK, type GardenSnapshot } from './GardenActivity.ts';
import { createLivingArm } from './LivingArm.ts';

export function gardenPour(activity: GardenSnapshot | null) {
  if (activity?.kind !== 'WaterPlants') return 0;
  let value = 0;
  for (const start of [.8, 3.6, 6.4]) {
    const t = activity.motionTime - start;
    value += THREE.MathUtils.smootherstep(t, 0, .5) * (1 - THREE.MathUtils.smootherstep(t, 1.35, 1.9));
  }
  return value * THREE.MathUtils.smootherstep(activity.pose, 0, 1);
}
export function createWateringCan() {
  const can = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#8ca49b', roughness: .7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.14, .13, .22, 20), metal); body.scale.z = .7; can.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.09, .016, 8, 20), metal);
  handle.rotation.y = Math.PI / 2; handle.position.set(.14, .08, -.04); can.add(handle);
  const start = new THREE.Vector3(0, -.035, .08), end = new THREE.Vector3(0, .04, .39);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.022, .035, start.distanceTo(end), 12), metal);
  spout.position.copy(start).add(end).multiplyScalar(.5);
  spout.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()); can.add(spout);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.05, .022, .06, 16), metal);
  nozzle.position.set(0, .04, .41); nozzle.rotation.x = Math.PI / 2; can.add(nozzle);
  const tip = new THREE.Group(); tip.name = 'WaterSpoutTip'; tip.position.set(0, .04, .445); can.add(tip);
  can.traverse(object => { if (object instanceof THREE.Mesh) {
    object.castShadow = true;
    object.raycast = function(raycaster, hits) {
      let ancestor: THREE.Object3D | null = this; while (ancestor?.visible) ancestor = ancestor.parent;
      if (!ancestor) THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
    };
  } }); return can;
}

export function createGardenVisual(joints: { root: THREE.Group; body: THREE.Group; head: THREE.Group; eyes: THREE.Group;
  arms: THREE.Group[]; legs: THREE.Group[]; tail: THREE.Group }) {
  const { root, body, head, eyes, arms, legs, tail } = joints;
  const bends = arms.map((arm, i) => createLivingArm(arm, i ? 1 : -1));
  const can = createWateringCan(); can.name = 'HeldGardenCan'; can.visible = false; can.scale.setScalar(0); root.add(can);
  let saved: Array<{ object: THREE.Object3D; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }> = [];
  const blend = THREE.MathUtils.smootherstep;
  return {
    restore() {
      bends.forEach(arm => arm.restore());
      for (const entry of saved) { entry.object.position.copy(entry.position); entry.object.rotation.copy(entry.rotation); entry.object.scale.copy(entry.scale); }
      saved = []; can.visible = false; can.scale.setScalar(0);
    },
    animate(activity: GardenSnapshot | null) {
      if (!activity || activity.pose <= 0) return;
      saved = [root, body, head, eyes, ...arms, ...legs, tail].map(object => ({ object,
        position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone() }));
      const p = blend(activity.pose, 0, 1), t = activity.motionTime;
      if (activity.kind === 'WaterPlants') {
        can.visible = true; can.scale.setScalar(1 / .76);
        root.updateWorldMatrix(true, true);
        can.position.copy(root.worldToLocal(CAN_PARK.clone().add(new THREE.Vector3(0, .07 * p, 0))));
        const worldRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .28 * gardenPour(activity)));
        can.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(worldRotation);
        root.updateWorldMatrix(true, true);
        arms.forEach((arm, i) => {
          arm.rotation.x *= 1 - p;
          const hand = can.localToWorld(i ? new THREE.Vector3(.14, .04, -.10) : new THREE.Vector3(-.14, -.04, -.11));
          const hint = body.localToWorld(new THREE.Vector3(i ? .5 : -.5, .60, .08));
          bends[i]!.pose(hand, hint, p);
        });
        head.rotation.x += .08 * p;
      } else if (activity.kind === 'GardenRest') {
        root.position.y += .345 * blend(activity.pose, 0, .6) + .08 * Math.sin(Math.PI * p);
        root.position.z -= 1.27 * blend(activity.pose, .3, 1);
        body.position.y -= .015 / .76 * p;
        body.rotation.x += (-.08 - body.rotation.x) * p;
        tail.rotation.y += (1.45 - tail.rotation.y) * blend(activity.pose, 0, .45);
        tail.rotation.x += (-.18 - tail.rotation.x) * p;
        legs.forEach((leg, i) => { leg.rotation.x -= .85 * p; leg.position.y += .167 * p; leg.position.z += (.40 + Math.sin(t * 1.5 + i) * .015) * p; });
        arms.forEach(arm => { arm.rotation.x += (-.65 - arm.rotation.x) * p; });
        eyes.scale.y *= 1 - .45 * p; head.rotation.z += Math.sin(t * .6) * .035 * p;
      } else {
        head.rotation.y += Math.sin(t * .8) * .20 * p;
        head.rotation.x -= (.08 + Math.sin(t * 1.1) * .035) * p;
        head.rotation.z += Math.sin(t * .7) * .045 * p;
      }
    },
  };
}
