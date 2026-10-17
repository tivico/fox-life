import * as THREE from 'three';
import type { CleanMode } from './daily.ts';

const up = new THREE.Vector3(0, 1, 0);
const smooth = THREE.MathUtils.smootherstep;

/** Three deliberate pushes, each followed by a lifted recovery and a pause. */
export function cleaningStroke(time: number) {
  const strokes = [
    { start: .5, end: 1.55, recover: 1.78, ready: 2.45, x: .14, z: .87 },
    { start: 3.0, end: 4.13, recover: 4.36, ready: 5.05, x: .10, z: .89 },
    { start: 5.7, end: 6.8, recover: 7.03, ready: 7.75, x: .13, z: .86 },
  ];
  for (const stroke of strokes) {
    if (time < stroke.start) break;
    if (time <= stroke.ready) {
      const push = smooth(time, stroke.start, stroke.end);
      const recover = smooth(time, stroke.recover, stroke.ready);
      const reach = push * (1 - recover);
      const pushing = time > stroke.start && time < stroke.end;
      const u = THREE.MathUtils.clamp((time - stroke.start) / (stroke.end - stroke.start), 0, 1);
      return { x: THREE.MathUtils.lerp(.36, stroke.x, reach), z: THREE.MathUtils.lerp(.61, stroke.z, reach),
        lift: Math.max(0, Math.sin(Math.PI * recover)) * .065, reach,
        dust: pushing ? Math.pow(Math.sin(Math.PI * u), 2) : 0, pushing, recovering: recover > 0 && recover < 1 };
    }
  }
  return { x: .36, z: .61, lift: 0, reach: 0, dust: 0, pushing: false, recovering: false };
}

export function createBroom() {
  const broom = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#ad855b', roughness: 1 });
  const straw = new THREE.MeshStandardMaterial({ color: '#d7bb79', roughness: 1 });
  const handle = new THREE.Group(); handle.name = 'BroomHandle'; handle.position.y = .13;
  broom.add(handle);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .9, 10), wood);
  shaft.name = 'BroomShaft'; shaft.position.y = .45; handle.add(shaft);
  const grip = new THREE.Group(); grip.name = 'BroomGripR'; grip.position.y = .61; handle.add(grip);
  const brush = new THREE.Mesh(new THREE.BoxGeometry(.27, .13, .13), straw);
  brush.name = 'BroomBrush'; brush.position.y = .065; broom.add(brush);
  for (let i = 0; i < 5; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.008, .11, .135), wood);
    seam.position.set(-.1 + i * .05, .055, 0); broom.add(seam);
  }
  return broom;
}

export function createCleaningVisual(joints: {
  root: THREE.Group; body: THREE.Group; head: THREE.Group; eyes: THREE.Group;
  arms: THREE.Group[]; legs: THREE.Group[]; tail: THREE.Group;
}) {
  const { root, body, head, arms, tail } = joints;
  const broom = createBroom(); broom.name = 'CleaningBroom'; root.add(broom);
  const handle = broom.getObjectByName('BroomHandle')!;
  const dust = new THREE.Group(); dust.name = 'CleaningDust'; root.add(dust);
  const dustMaterial = new THREE.MeshStandardMaterial({ color: '#bda889', roughness: 1 });
  for (let i = 0; i < 4; i++) dust.add(new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 4), dustMaterial));
  let workBlend = 0;
  const matrix = (object: THREE.Object3D) => new THREE.Matrix4().compose(object.position, object.quaternion, object.scale);
  return {
    props: [broom, dust],
    animate(pose: number, time: number, mode: CleanMode, park: THREE.Vector3, parkYaw: number, dt: number) {
      const gripBlend = smooth(pose, 0, .43);
      const pickup = smooth(pose, .43, 1);
      workBlend = THREE.MathUtils.damp(workBlend, mode === 'sweep' ? 1 : 0, 12, dt);
      const stroke = cleaningStroke(time);
      const work = workBlend * pickup;
      // Feet belong to the visual root; a small torso lean leaves them planted.
      body.rotation.x += (.012 + .033 * work) * gripBlend;
      body.rotation.z -= .028 * stroke.reach * work;
      body.position.x += .015 * stroke.reach * work;
      body.position.z += .02 * gripBlend;
      const posedBody = matrix(body);
      head.rotation.x += (.025 + .17 * work) * gripBlend;
      head.rotation.y += (.05 - .11 * stroke.reach) * work;
      tail.rotation.y += .07 * stroke.reach * work;
      tail.rotation.x -= .035 * work;

      // Keep the original one-piece arm and paw. Only rotate at the shoulder;
      // the broom follows this hand instead of pulling the arm toward a tool path.
      const arm = arms[1]!;
      const pawLocal = new THREE.Vector3(.05, -.34, 0);
      const parkedGrip = park.clone().add(new THREE.Vector3(0, .74, 0)).applyMatrix4(posedBody.clone().invert()).sub(arm.position);
      const reaching = new THREE.Quaternion().setFromUnitVectors(pawLocal.clone().normalize(), parkedGrip.normalize());
      const carrying = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.lerp(-1.8, -.6 - .15 * stroke.reach, work),
        -.08 * work, .08));
      const target = reaching.slerp(carrying, pickup);
      arm.quaternion.slerp(target, gripBlend);
      const palm = pawLocal.clone().applyMatrix4(matrix(arm)).applyMatrix4(posedBody);
      const height = THREE.MathUtils.lerp(.28, .002 + stroke.lift, work);
      const vertical = THREE.MathUtils.clamp((palm.y - .13 - height) / .61, -.99, .99);
      const horizontal = Math.sqrt(1 - vertical * vertical);
      const sweepAngle = THREE.MathUtils.lerp(.9, .30 - .45 * stroke.reach, work);
      const heldAxis = new THREE.Vector3(-Math.sin(sweepAngle) * horizontal, vertical, -Math.cos(sweepAngle) * horizontal);
      const held = palm.clone().addScaledVector(heldAxis, -.61).sub(new THREE.Vector3(0, .13, 0));
      broom.position.copy(park).lerp(held, pickup);
      const yaw = -.6 * work;
      const angle = Math.atan2(Math.sin(yaw - parkYaw), Math.cos(yaw - parkYaw));
      broom.rotation.set(0, parkYaw + angle * pickup, 0);
      broom.scale.setScalar(1); broom.visible = true;
      const axis = up.clone().lerp(heldAxis, pickup).normalize();
      handle.quaternion.setFromUnitVectors(up, axis.clone().applyAxisAngle(up, -broom.rotation.y));
      const dustAmount = mode === 'sweep' && broom.position.y <= .006 ? stroke.dust * work : 0;
      dust.visible = dustAmount > .001;
      dust.scale.setScalar(dust.visible ? 1 : 0);
      dust.children.forEach((particle, i) => {
        const u = .2 + i * .17;
        particle.position.set(broom.position.x + (i - 1.5) * .025,
          .023 + Math.sin(u * Math.PI) * .012, broom.position.z + .06 + u * .1);
        particle.scale.setScalar(dustAmount * (.65 + i * .1));
      });
    },
    reset() { workBlend = 0; },
  };
}
