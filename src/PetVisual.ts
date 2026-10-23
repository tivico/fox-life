import * as THREE from 'three';
import { petPose, type PetSnapshot } from './pet.ts';

// The pet reaction is the last overlay of a frame; restore() removes it before the next baseline pose.
export function createPetVisual(joints: { body: THREE.Group; head: THREE.Group; eyes: THREE.Group; ears: THREE.Group[]; tail: THREE.Group }) {
  const { body, head, eyes, ears, tail } = joints;
  const objects = [body, head, eyes, tail, ...ears];
  let saved: Array<{ object: THREE.Object3D; rotation: THREE.Euler; scale: THREE.Vector3 }> = [];
  return {
    restore() {
      for (const pose of saved) { pose.object.rotation.copy(pose.rotation); pose.object.scale.copy(pose.scale); }
      saved = [];
    },
    animate(pet: PetSnapshot | null) {
      if (!pet) return;
      saved = objects.map(object => ({ object, rotation: object.rotation.clone(), scale: object.scale.clone() }));
      const pose = petPose(pet);
      head.rotation.x += pose.headX; head.rotation.y += pose.headY; head.rotation.z += pose.headZ;
      body.rotation.z += pose.bodyZ;
      eyes.scale.y *= pose.eyes;
      ears.forEach((ear, index) => { ear.rotation.x += pose.earX[index]!; ear.rotation.z += pose.earZ[index]!; });
      tail.rotation.y += pose.tailYaw; tail.rotation.x += pose.tailPitch;
    },
  };
}
