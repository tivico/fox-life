import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CharacterState, IdleVariation } from './Character.ts';

/** Fox-specific geometry; behavior only knows Character states. */
export function createFoxVisual() {
  const root = new THREE.Group();
  // Scale only the visual child: movement, targets and arrival tolerances stay in world units.
  root.scale.setScalar(0.76);
  const body = new THREE.Group();
  root.add(body);
  const fur = new THREE.MeshStandardMaterial({ color: '#bc713f', roughness: 0.93 });
  const cream = new THREE.MeshStandardMaterial({ color: '#eee1c5', roughness: 0.95 });
  const green = new THREE.MeshStandardMaterial({ color: '#647d57', roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#493c32', roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: '#bf8a70', roughness: 1 });
  const sphere = new THREE.SphereGeometry(1, 24, 18);
  function ellipsoid(parent: THREE.Group, material: THREE.Material, scale: number[], position: number[]) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.set(scale[0]!, scale[1]!, scale[2]!);
    mesh.position.set(position[0]!, position[1]!, position[2]!);
    parent.add(mesh);
    return mesh;
  }
  ellipsoid(body, fur, [0.265, 0.35, 0.225], [0, 0.68, 0]);
  ellipsoid(body, green, [0.285, 0.27, 0.24], [0, 0.51, 0]);
  ellipsoid(body, cream, [0.145, 0.18, 0.04], [0, 0.82, 0.215]);
  const bib = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.28, 0.065, 3, 0.025), green);
  bib.position.set(0, 0.69, 0.235);
  body.add(bib);
  for (const x of [-0.14, 0.14]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.32, 0.06, 3, 0.022), green);
    strap.position.set(x, 0.85, 0.215);
    body.add(strap);
    ellipsoid(body, cream, [0.021, 0.021, 0.012], [x, 0.79, 0.268]);
  }
  const head = new THREE.Group();
  head.position.set(0, 1.14, 0.035);
  body.add(head);
  ellipsoid(head, fur, [0.375, 0.30, 0.305], [0, 0, 0]);
  for (const sign of [-1, 1]) {
    const cheek = ellipsoid(head, cream, [0.165, 0.105, 0.045], [sign * 0.175, -0.105, 0.245]);
    cheek.rotation.z = -sign * 0.2;
  }
  ellipsoid(head, cream, [0.135, 0.085, 0.175], [0, -0.10, 0.315]);
  ellipsoid(head, dark, [0.047, 0.034, 0.035], [0, -0.077, 0.474]);
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const x of [-0.145, 0.145]) {
    ellipsoid(eyes, dark, [0.028, 0.038, 0.02], [x, 0.037, 0.278]);
    // Small matte eyes; no separate sparkle or eyebrow geometry.
  }
  const ears: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sign * 0.255, 0.20, -0.035);
    ear.rotation.z = -sign * 0.15;
    // A soft triangular outline with depth, rather than a sharp three-sided cone.
    const outline = new THREE.Shape();
    outline.moveTo(-0.15, -0.025);
    outline.quadraticCurveTo(-0.16, 0.07, -0.055, 0.275);
    outline.quadraticCurveTo(0, 0.35, 0.055, 0.275);
    outline.quadraticCurveTo(0.16, 0.07, 0.15, -0.025);
    outline.quadraticCurveTo(0, -0.085, -0.15, -0.025);
    const earGeometry = new THREE.ExtrudeGeometry(outline, {
      depth: 0.10, bevelEnabled: true, bevelSegments: 3,
      steps: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 8,
    });
    earGeometry.translate(0, 0, -0.05);
    const outer = new THREE.Mesh(earGeometry, fur);
    ear.add(outer);
    const inner = new THREE.Mesh(earGeometry, pink);
    inner.scale.set(0.58, 0.65, 0.25);
    inner.position.set(0, 0.025, 0.069);
    ear.add(inner);
    head.add(ear);
    ears.push(ear);
  }
  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.255, 0.84, 0);
    ellipsoid(arm, fur, [0.105, 0.22, 0.105], [sign * 0.035, -0.14, 0]);
    ellipsoid(arm, dark, [0.085, 0.09, 0.09], [sign * 0.035, -0.29, 0.012]);
    body.add(arm);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(sign * 0.14, 0, 0);
    ellipsoid(leg, green, [0.125, 0.20, 0.135], [0, 0.28, 0]);
    ellipsoid(leg, dark, [0.12, 0.1, 0.17], [0, 0.1, 0.07]);
    root.add(leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.53, -0.18);
  body.add(tail);
  // One continuous brush-shaped surface; the cream tip shares the same contour.
  const tailPoints: number[] = [];
  const tailIndices: number[] = [];
  const rings = 20;
  const sides = 24;
  const tailGeometry = new THREE.BufferGeometry();
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const radius = ring === rings ? 0 : 0.085 * (1 - t) + 0.33 * Math.pow(Math.sin(Math.PI * t), 0.85);
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      tailPoints.push(0.16 * t + Math.cos(angle) * radius,
        0.06 + 0.43 * t + Math.sin(angle) * radius, -1.18 * t);
      if (ring < rings) {
        const i = ring * sides + side;
        const next = ring * sides + (side + 1) % sides;
        tailIndices.push(i, i + sides, next, next, i + sides, next + sides);
      }
    }
  }
  tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tailPoints, 3));
  tailGeometry.setIndex(tailIndices);
  tailGeometry.computeVertexNormals();
  const creamStart = 14 * sides * 6;
  tailGeometry.addGroup(0, creamStart, 0);
  tailGeometry.addGroup(creamStart, tailIndices.length - creamStart, 1);
  tail.add(new THREE.Mesh(tailGeometry, [fur, cream]));
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
