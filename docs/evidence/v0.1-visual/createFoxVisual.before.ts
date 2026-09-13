import * as THREE from 'three';
import type { CharacterState, IdleVariation } from './Character.ts';

/** Fox-specific geometry; behavior only knows Character states. */
export function createFoxVisual() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = new THREE.MeshStandardMaterial({ color: '#c66b36', roughness: 0.93 });
  const cream = new THREE.MeshStandardMaterial({ color: '#fff0d2', roughness: 0.95 });
  const green = new THREE.MeshStandardMaterial({ color: '#647d57', roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#362e2b', roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: '#dd9a80', roughness: 1 });
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  function ellipsoid(parent: THREE.Group, material: THREE.Material, scale: number[], position: number[]) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.set(scale[0]!, scale[1]!, scale[2]!);
    mesh.position.set(position[0]!, position[1]!, position[2]!);
    parent.add(mesh);
    return mesh;
  }
  ellipsoid(body, fur, [0.3, 0.4, 0.25], [0, 0.69, 0]);
  ellipsoid(body, green, [0.32, 0.28, 0.265], [0, 0.52, 0]);
  ellipsoid(body, cream, [0.19, 0.23, 0.05], [0, 0.82, 0.24]);
  const bib = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.055), green);
  bib.position.set(0, 0.7, 0.265);
  body.add(bib);
  for (const x of [-0.14, 0.14]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.37, 0.06), green);
    strap.position.set(x, 0.87, 0.245);
    body.add(strap);
    ellipsoid(body, cream, [0.027, 0.027, 0.015], [x, 0.8, 0.285]);
  }
  const head = new THREE.Group();
  head.position.set(0, 1.2, 0.04);
  body.add(head);
  ellipsoid(head, fur, [0.43, 0.345, 0.33], [0, 0, 0]);
  for (const sign of [-1, 1]) {
    const cheek = ellipsoid(head, cream, [0.235, 0.18, 0.19], [sign * 0.2, -0.09, 0.23]);
    cheek.rotation.z = -sign * 0.2;
  }
  ellipsoid(head, cream, [0.19, 0.12, 0.22], [0, -0.105, 0.37]);
  ellipsoid(head, dark, [0.072, 0.05, 0.05], [0, -0.075, 0.57]);
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const x of [-0.17, 0.17]) {
    ellipsoid(eyes, dark, [0.045, 0.057, 0.035], [x, 0.055, 0.303]);
    ellipsoid(eyes, cream, [0.012, 0.014, 0.012], [x - 0.012, 0.07, 0.331]);
  }
  const ears: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sign * 0.28, 0.22, -0.025);
    ear.rotation.z = -sign * 0.18;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.185, 0.48, 3), fur);
    outer.scale.z = 0.7;
    outer.position.y = 0.18;
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.31, 3), pink);
    inner.scale.z = 0.3;
    inner.position.set(0, 0.19, 0.085);
    ear.add(inner);
    head.add(ear);
    ears.push(ear);
  }
  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.31, 0.86, 0);
    ellipsoid(arm, fur, [0.095, 0.22, 0.1], [sign * 0.035, -0.16, 0]);
    ellipsoid(arm, dark, [0.087, 0.08, 0.095], [sign * 0.04, -0.33, 0.015]);
    body.add(arm);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(sign * 0.16, 0, 0);
    ellipsoid(leg, green, [0.13, 0.17, 0.14], [0, 0.285, 0]);
    ellipsoid(leg, dark, [0.13, 0.1, 0.19], [0, 0.1, 0.07]);
    root.add(leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.53, -0.18);
  body.add(tail);
  const tailFur = ellipsoid(tail, fur, [0.26, 0.28, 0.5], [0, 0.1, -0.38]);
  tailFur.rotation.x = 0.28;
  const tip = ellipsoid(tail, cream, [0.21, 0.23, 0.28], [0, 0.24, -0.73]);
  tip.rotation.x = 0.35;
  root.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = true; });
  let gait = 0;
  let walkBlend = 0;
  let observeBlend = 0;
  let lookBlend = 0;
  return {
    root,
    animate({ dt, time, distance, state, variation, observeTime }: {
      dt: number; time: number; distance: number; state: CharacterState;
      variation: IdleVariation; observeTime: number;
    }) {
      const damp = (value: number, target: number) => THREE.MathUtils.damp(value, target, 7, dt);
      gait += distance * 11;
      walkBlend = damp(walkBlend, distance > 0.0001 ? 1 : 0);
      observeBlend = damp(observeBlend, state === 'Observe' ? 1 : 0);
      lookBlend = damp(lookBlend, state === 'Idle' && variation === 'Look around' ? 1 : 0);
      const breath = Math.sin(time * 2.1);
      body.scale.y = 1 + breath * 0.009;
      body.position.y = Math.abs(Math.sin(gait)) * 0.022 * walkBlend;
      body.rotation.z = Math.sin(time * 0.85) * 0.03 * lookBlend + Math.sin(gait) * 0.025 * walkBlend;
      body.rotation.x = -0.045 * observeBlend;
      head.rotation.y = damp(head.rotation.y,
        Math.sin(time * 0.9) * 0.23 * lookBlend + Math.sin(observeTime * 1.35) * 0.19 * observeBlend);
      head.rotation.x = damp(head.rotation.x, -0.15 * observeBlend + breath * 0.016);
      eyes.position.x = Math.sin(time * 0.7) * 0.013 * (1 - walkBlend);
      const blink = Math.pow(Math.max(0, Math.cos(time * 1.13)), 36);
      eyes.scale.y = 1 - blink * 0.8;
      ears.forEach((ear, index) => { ear.rotation.x = Math.sin(time * 1.7 + index * 2.1) * 0.075; });
      tail.rotation.y = Math.sin(time * 1.25) * 0.15 + Math.sin(gait) * 0.07 * walkBlend;
      tail.rotation.x = Math.sin(time * 0.8 + 1.2) * 0.06;
      legs.forEach((leg, index) => {
        const step = Math.sin(gait + index * Math.PI);
        leg.position.z = step * 0.09 * walkBlend;
        leg.position.y = Math.max(0, step) * 0.04 * walkBlend;
        arms[index]!.rotation.x = -step * 0.28 * walkBlend - observeBlend * 0.12;
      });
    },
  };
}
