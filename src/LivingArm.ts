import * as THREE from 'three';

/** Bend the existing continuous arm surface around an elbow, keeping its shoulder fixed. */
export function createLivingArm(arm: THREE.Group, side: number) {
  const mesh = arm.children[0] as THREE.Mesh;
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const rest = positions.clone(), normals = geometry.getAttribute('normal').clone();
  geometry.setAttribute('armRestPosition', rest);
  const shoulder = new THREE.Vector3(side * .05, 0, 0);
  const upperLength = .18, lowerLength = .16;
  const down = new THREE.Vector3(0, -1, 0);
  const vertex = new THREE.Vector3(), upper = new THREE.Vector3(), lower = new THREE.Vector3();
  let posed = false;
  return {
    restore() {
      if (!posed) return;
      positions.copy(rest); positions.needsUpdate = true;
      (geometry.getAttribute('normal') as THREE.BufferAttribute).copy(normals); geometry.getAttribute('normal').needsUpdate = true;
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); posed = false;
    },
    pose(target: THREE.Vector3, elbowHint: THREE.Vector3, amount: number) {
      if (amount <= 0) return;
      arm.updateWorldMatrix(true, false);
      const wrist = arm.worldToLocal(target.clone());
      const hint = arm.worldToLocal(elbowHint.clone()).sub(shoulder);
      const direction = wrist.clone().sub(shoulder);
      const distance = THREE.MathUtils.clamp(direction.length(), .025, upperLength + lowerLength - .0005);
      direction.normalize();
      const pole = hint.addScaledVector(direction, -hint.dot(direction)).normalize();
      const along = (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * distance);
      const elbow = shoulder.clone().addScaledVector(direction, along)
        .addScaledVector(pole, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)));
      wrist.copy(shoulder).addScaledVector(direction, distance);
      const upperRotation = new THREE.Quaternion().setFromUnitVectors(down, elbow.clone().sub(shoulder).normalize());
      const lowerRotation = new THREE.Quaternion().setFromUnitVectors(down, wrist.clone().sub(elbow).normalize());
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(rest, i).multiply(mesh.scale).add(mesh.position);
        upper.copy(vertex).sub(shoulder).applyQuaternion(upperRotation).add(shoulder);
        lower.copy(vertex).sub(shoulder); lower.y += upperLength;
        lower.applyQuaternion(lowerRotation).add(elbow);
        const joint = THREE.MathUtils.smootherstep(-vertex.y, upperLength - .025, upperLength + .025);
        upper.lerp(lower, joint);
        vertex.lerp(upper, amount).sub(mesh.position).divide(mesh.scale);
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      posed = true;
    },
  };
}
