import * as THREE from 'three';
import { NOSE, PAW, type PairPose } from './Pair.ts';

const step = THREE.MathUtils.smootherstep;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

// A pair overlay runs after the activity poses; restore() removes it before the next baseline pose.
export function createPairVisual(joints: { root: THREE.Group; body: THREE.Group; head: THREE.Group; eyes: THREE.Group;
  ears: THREE.Group[]; arms: THREE.Group[]; tail: THREE.Group }) {
  const { root, body, head, eyes, ears, arms, tail } = joints;
  const objects = [body, head, eyes, tail, ...ears, ...arms];
  let saved: Array<{ object: THREE.Object3D; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }> = [];
  return {
    restore() {
      for (const pose of saved) { pose.object.position.copy(pose.position); pose.object.rotation.copy(pose.rotation); pose.object.scale.copy(pose.scale); }
      saved = [];
    },
    animate(pair: PairPose | null) {
      if (!pair || pair.pose <= 0) return;
      const remote = root.getObjectByName('HeldRemote');
      saved = [...objects, ...(remote ? [remote] : [])].map(object => ({ object, position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone() }));
      const p = step(pair.pose, 0, 1), t = pair.motionTime;
      if (pair.kind === 'Boop') {
        // Lean in from the ankles and tip the head so the nose meets the other at their shared height,
        // close the eyes at the touch, then a happy wag.
        const contact = step(t, .2, .9) * (1 - step(t, 2.2, 2.8));
        const touch = step(t, .7, 1.0) * (1 - step(t, 2.0, 2.4));
        const scale = root.scale.x, size = head.scale.x;
        // The nose tip in the fox's own units for a head pitch and a body lean, both about the x axis.
        const noseAt = (pitch: number, lean: number) => {
          const y = head.position.y + size * (NOSE.y * Math.cos(pitch) - NOSE.z * Math.sin(pitch));
          const z = head.position.z + size * (NOSE.y * Math.sin(pitch) + NOSE.z * Math.cos(pitch));
          return { y: y * Math.cos(lean) - z * Math.sin(lean), z: y * Math.sin(lean) + z * Math.cos(lean), Y: y, Z: z };
        };
        const rest = noseAt(0, 0);
        const want = { y: rest.y + pair.rise * contact / scale, z: rest.z + pair.reach * contact / scale };
        // Lean for reach and pitch for height; a few rounds settle how each one shifts the other.
        let pitch = 0, lean = 0;
        for (let i = 0; i < 4; i++) {
          const { Y, Z } = noseAt(pitch, 0);
          lean = Math.asin(THREE.MathUtils.clamp(want.z / Math.hypot(Y, Z), -1, 1)) - Math.atan2(Z, Y);
          pitch -= (want.y - noseAt(pitch, lean).y) / (size * NOSE.length());
        }
        // Where the two stopped a little off line, each turns its head to cover half the sideways gap.
        const yaw = Math.asin(THREE.MathUtils.clamp(pair.lateral * contact / 2 / (scale * NOSE.z * size), -.4, .4));
        // Hold still for the touch: the idle sway and head tilt would otherwise slide the noses apart.
        body.rotation.x += (lean - body.rotation.x) * p;
        body.rotation.z += -body.rotation.z * p;
        head.rotation.x += (pitch - head.rotation.x) * p;
        head.rotation.y += (yaw - head.rotation.y) * p;
        head.rotation.z += -head.rotation.z * p;
        eyes.scale.y *= 1 - .8 * touch * p;
        ears.forEach(ear => { ear.rotation.x += -.22 * touch * p; });
        tail.rotation.y += Math.sin(t * 8) * .3 * step(t, 1.4, 1.8) * p;
      } else if (pair.kind === 'WatchTVTogether') {
        // A brief shared glance and small tail wag, over the existing seated TV pose.
        const glance = step(t, 5, 6) * (1 - step(t, 7.5, 8.5));
        head.rotation.y += pair.side * .35 * glance * p;
        head.rotation.z += -pair.side * .035 * glance * p;
        tail.rotation.x += Math.sin(t * 2) * .035 * p;
        const lean = (pair.headLean ?? 0) * p;
        if (lean > 0) {
          body.updateMatrix(); tail.updateMatrix();
          const before = body.matrix.clone();
          const tailInRoot = before.clone().multiply(tail.matrix);
          // Lean the connected torso and head about the hips; the feet and seated tail stay planted.
          // Keep a small gap between the complete head silhouettes, including the ears.
          const roll = -pair.side * .33 * lean;
          body.rotation.z += roll;
          body.position.x += .35 * Math.sin(roll);
          body.position.y += .35 * (1 - Math.cos(roll)) + .035 * lean;
          head.rotation.y *= 1 - lean;
          head.rotation.z += -pair.side * .08 * lean;
          ears[pair.side < 0 ? 0 : 1]!.rotation.x -= .35 * lean;
          eyes.scale.y *= 1 - .6 * lean;
          body.updateMatrix();
          body.matrix.clone().invert().multiply(tailInRoot).decompose(tail.position, tail.quaternion, tail.scale);
          if (remote?.visible) {
            remote.updateMatrix();
            body.matrix.clone().multiply(before.invert()).multiply(remote.matrix)
              .decompose(remote.position, remote.quaternion, remote.scale);
          }
        }
      } else {
        // Side by side at the window holding the inner paws, with a small swing; heads lean together, with one shared glance.
        const hold = step(t, 0, .9) * (1 - step(t, 6.1, 6.9));
        const lean = step(t, 1.2, 2.4) * (1 - step(t, 5.6, 6.8));
        const glance = step(t, 3.0, 3.5) * (1 - step(t, 4.4, 4.9));
        head.rotation.z += -pair.side * .08 * lean * p;
        head.rotation.y += pair.side * .55 * glance * p;
        tail.rotation.y += pair.side * .25 * p;
        if (pair.hand) {
          const arm = arms[pair.side < 0 ? 0 : 1]!;
          // Both face the window, so swinging forward in each one's own frame moves the joined paws together.
          const meet = pair.hand.clone();
          meet.z += Math.sin(Math.max(0, t - .9) * 2.6) * .025 * hold;
          // Aim the arm at the meeting point from inside the body, whatever pose the body is in.
          body.updateMatrix();
          const aim = meet.divideScalar(root.scale.x).applyMatrix4(body.matrix.clone().invert()).sub(arm.position).setLength(PAW.length());
          // The arm turns about z (out to the side) and then x (forward), the Euler order three.js applies.
          const px = pair.side * PAW.x, py = PAW.y, out = Math.acos(THREE.MathUtils.clamp(aim.x / Math.hypot(px, py), -1, 1));
          const roll = [out, -out].map(turn => wrap(turn - Math.atan2(py, px))).reduce((a, b) => Math.abs(a) < Math.abs(b) ? a : b);
          const drop = px * Math.sin(roll) + py * Math.cos(roll);
          const swing = Math.atan2(aim.z / drop, aim.y / drop);
          const h = hold * p;
          arm.rotation.x += (swing - arm.rotation.x) * h;
          arm.rotation.y += -arm.rotation.y * h;
          arm.rotation.z += (roll - arm.rotation.z) * h;
        }
      }
    },
  };
}
