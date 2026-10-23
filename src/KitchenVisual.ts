import * as THREE from 'three';
import { kitchenMotion, type KitchenSnapshot } from './KitchenActivity.ts';
import { createLivingArm } from './LivingArm.ts';

export function createKitchenVisual(joints: { body: THREE.Group; head: THREE.Group; arms: THREE.Group[]; legs: THREE.Group[] }) {
  const { body, head, arms, legs } = joints;
  const bends = arms.map((arm, i) => createLivingArm(arm, i ? 1 : -1));
  let saved: Array<{ object: THREE.Object3D; rotation: THREE.Euler; position: THREE.Vector3 }> = [];
  return {
    restore() {
      bends.forEach(arm => arm.restore());
      saved.forEach(entry => { entry.object.rotation.copy(entry.rotation); entry.object.position.copy(entry.position); }); saved = [];
    },
    animate(activity: KitchenSnapshot | null) {
      if (!activity || activity.pose <= 0 && activity.phase !== 'retreat') return;
      saved = [head, ...arms, ...legs].map(object => ({ object, rotation: object.rotation.clone(), position: object.position.clone() }));
      if (activity.phase === 'retreat') {
        const t = activity.elapsed, envelope = Math.sin(Math.PI * Math.min(1, t / 1.2));
        legs.forEach((leg, i) => {
          const stride = t * Math.PI * 4 / 1.2 + i * Math.PI;
          leg.position.y += Math.max(0, Math.sin(stride)) * .075 * envelope;
          leg.position.z += Math.cos(stride) * .075 * envelope;
        });
        return;
      }
      const motion = kitchenMotion(activity, activity.kind);
      arms.forEach((arm, i) => {
        const amount = i || activity.kind !== 'BakeCookies' ? motion.armAmount : 0;
        arm.rotation.x *= 1 - amount;
        body.updateWorldMatrix(true, true);
        const hint = body.localToWorld(new THREE.Vector3(i ? .50 : -.50, .58, .08));
        bends[i]!.pose(i ? motion.right : motion.left, hint, amount);
      });
      head.rotation.x += (activity.kind === 'BakeCookies' ? .03 : .07) * motion.p;
      head.rotation.z += Math.sin(motion.t * .65) * .02 * motion.p;
    },
  };
}
