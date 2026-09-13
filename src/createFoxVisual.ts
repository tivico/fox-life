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
  // A single pear-shaped torso continues into the neck beneath the head.
  const torsoGeometry = new THREE.LatheGeometry([
    [0, 0.28], [0.14, 0.30], [0.24, 0.38], [0.28, 0.50],
    [0.27, 0.64], [0.235, 0.78], [0.19, 0.90], [0.145, 1.02], [0.13, 1.09], [0, 1.12],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 24);
  torsoGeometry.scale(1, 1, 0.84);
  function surfaceColors(geometry: THREE.BufferGeometry, colorAt: (x: number, y: number, z: number) => THREE.Color) {
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const c = colorAt(positions.getX(i), positions.getY(i), positions.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  const painted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 });
  surfaceColors(torsoGeometry, (_x, y) => green.color.clone().lerp(fur.color, THREE.MathUtils.smoothstep(y, 0.66, 0.72)));
  body.add(new THREE.Mesh(torsoGeometry, painted));
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
  head.name = 'FoxHead';
  body.add(head);
  // Sculpt the muzzle into the head surface; cream is a color region, not attached cheeks.
  const headGeometry = sphere.clone();
  const headPositions = headGeometry.getAttribute('position');
  for (let i = 0; i < headPositions.count; i++) {
    const x = headPositions.getX(i) * 0.375;
    const y = headPositions.getY(i) * 0.30;
    let z = headPositions.getZ(i) * 0.305;
    if (z > 0) z += 0.15 * Math.exp(-Math.pow(x / 0.145, 2) - Math.pow((y + 0.09) / 0.11, 2));
    headPositions.setXYZ(i, x, y, z);
  }
  headGeometry.computeVertexNormals();
  surfaceColors(headGeometry, (x, y, z) => {
    const cheekLine = -0.035 - 0.12 * Math.abs(x);
    const mask = THREE.MathUtils.smoothstep(z, 0.13, 0.22) * (1 - THREE.MathUtils.smoothstep(y, cheekLine - 0.025, cheekLine + 0.015));
    return fur.color.clone().lerp(cream.color, mask);
  });
  head.add(new THREE.Mesh(headGeometry, painted));
  ellipsoid(head, dark, [0.038, 0.028, 0.024], [0, -0.075, 0.438]);
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const x of [-0.145, 0.145]) {
    ellipsoid(eyes, dark, [0.025, 0.033, 0.009], [x, 0.037, 0.298]);
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
    arm.position.set(sign * 0.22, 0.82, 0);
    const armGeometry = sphere.clone();
    surfaceColors(armGeometry, (_x, y) => dark.color.clone().lerp(fur.color, THREE.MathUtils.smoothstep(y, -0.72, -0.32)));
    const armMesh = new THREE.Mesh(armGeometry, painted);
    armMesh.scale.set(0.105, 0.245, 0.10);
    armMesh.position.set(sign * 0.05, -0.13, 0);
    arm.rotation.z = sign * 0.08;
    arm.add(armMesh);
    body.add(arm);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.name = sign < 0 ? 'FoxLegL' : 'FoxLegR';
    leg.position.set(sign * 0.14, 0, 0);
    const legGeometry = new THREE.LatheGeometry([
      [0, 0], [0.07, 0.008], [0.115, 0.055], [0.12, 0.12],
      [0.115, 0.21], [0.125, 0.31], [0.13, 0.39], [0.10, 0.46], [0, 0.49],
    ].map(([x, y]) => new THREE.Vector2(x, y)), 20);
    const legPositions = legGeometry.getAttribute('position');
    for (let i = 0; i < legPositions.count; i++) {
      const foot = 1 - THREE.MathUtils.smoothstep(legPositions.getY(i), 0.10, 0.23);
      legPositions.setZ(i, legPositions.getZ(i) * (1 + foot * 0.3) + foot * 0.04);
    }
    legGeometry.computeVertexNormals();
    surfaceColors(legGeometry, (_x, y) => dark.color.clone().lerp(green.color, THREE.MathUtils.smoothstep(y, 0.14, 0.19)));
    leg.add(new THREE.Mesh(legGeometry, painted));
    root.add(leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.53, -0.10);
  tail.name = 'FoxTail';
  body.add(tail);
  // One continuous brush-shaped surface; the cream tip shares the same contour.
  const tailPoints: number[] = [];
  const tailIndices: number[] = [];
  const rings = 20;
  const sides = 24;
  const tailGeometry = new THREE.BufferGeometry();
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const radius = ring === rings ? 0 : 0.14 * (1 - t) + 0.33 * Math.pow(Math.sin(Math.PI * t), 0.85);
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
  let turnBlend = 0;
  let observeBlend = 0;
  let lookBlend = 0;
  let previousState: CharacterState = 'Idle';
  let startTime = 1;
  let smoothedSpeed = 0;
  let lastSpeed = 0;
  // Small bounded springs for visual lag only, substepped for low update rates.
  function secondary(frequency: number, damping: number) {
    let value = 0;
    let velocity = 0;
    return (target: number, dt: number) => {
      const steps = Math.max(1, Math.ceil(dt * 120));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        velocity += ((target - value) * frequency * frequency - 2 * damping * frequency * velocity) * h;
        value += velocity * h;
      }
      return value;
    };
  }
  const tailYaw = secondary(7, 0.72);
  const tailPitch = secondary(8, 0.8);
  const earMotion = [secondary(12, 0.78), secondary(13, 0.8)];
  return {
    root,
    animate({ dt, time, distance, state, variation, observeTime, turnRate = 0, headingError = 0, preparingObserve = false }: {
      dt: number; time: number; distance: number; state: CharacterState;
      variation: IdleVariation; observeTime: number; turnRate?: number; headingError?: number; preparingObserve?: boolean;
    }) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 0.05);
      const damp = (value: number, target: number, rate = 7) => THREE.MathUtils.damp(value, target, rate, dt);
      if (state === 'Walk' && previousState !== 'Walk') startTime = 0;
      startTime += dt;
      previousState = state;
      const anticipation = startTime < 0.22 ? Math.sin(Math.PI * startTime / 0.22) : 0;
      const speed = Math.min(1.05, distance / dt);
      smoothedSpeed = damp(smoothedSpeed, speed, 9);
      const acceleration = THREE.MathUtils.clamp((speed - lastSpeed) / dt, -3, 3);
      lastSpeed = speed;
      gait += distance * 14.5;
      walkBlend = damp(walkBlend, THREE.MathUtils.smoothstep(smoothedSpeed, 0.015, 0.7), 8);
      turnBlend = damp(turnBlend, state === 'Walk'
        ? THREE.MathUtils.smoothstep(Math.abs(turnRate), 0.15, 1.8)
          * THREE.MathUtils.smoothstep(Math.abs(headingError), 0.55, 1.15) * (1 - walkBlend) : 0, 10);
      // Continue a shared foot phase while pivoting, then blend into distance-driven gait.
      gait += Math.abs(turnRate) * dt * 3.8 * turnBlend;
      observeBlend = damp(observeBlend, state === 'Observe' || preparingObserve ? 1 : 0, 5);
      lookBlend = damp(lookBlend, state === 'Idle' && variation === 'Look around' ? 1 : 0, 4);
      const breath = Math.sin(time * 2.1);
      body.scale.y = damp(body.scale.y, 1 + breath * 0.007 - anticipation * 0.012);
      body.position.y = damp(body.position.y, Math.pow(Math.sin(gait), 2) * 0.015 * walkBlend - anticipation * 0.009);
      body.rotation.z = damp(body.rotation.z, Math.sin(time * 0.85) * 0.02 * lookBlend
        + Math.sin(gait) * (0.018 * walkBlend + 0.025 * turnBlend) - turnRate * 0.012);
      body.rotation.x = damp(body.rotation.x, -0.035 * observeBlend + acceleration * 0.01 - anticipation * 0.018, 6);
      // Ease into a glance, hold it briefly, then return; avoid continuous metronomic scanning.
      const glance = state === 'Observe'
        ? THREE.MathUtils.smoothstep(observeTime, 0.35, 1.25) * (1 - THREE.MathUtils.smoothstep(observeTime, 2.4, 3.7)) : 0;
      head.rotation.y = damp(head.rotation.y, Math.sin(time * 0.65) * 0.18 * lookBlend
        + 0.22 * glance + THREE.MathUtils.clamp(headingError * 0.65, -0.48, 0.48), 12);
      head.rotation.x = damp(head.rotation.x, -0.13 * observeBlend - 0.035 * glance + breath * 0.012, 5);
      eyes.position.x = damp(eyes.position.x, Math.sin(time * 0.7) * 0.005 * (1 - walkBlend) + glance * 0.006);
      const blink = Math.pow(Math.max(0, Math.cos(time * 1.13)), 36);
      eyes.scale.y = 1 - blink * 0.8;
      ears.forEach((ear, index) => {
        ear.rotation.x = earMotion[index]!(Math.sin(time * 1.4 + index * 2.1) * 0.025
          - acceleration * 0.014 + turnRate * (index === 0 ? 0.016 : -0.012), dt);
      });
      tail.rotation.y = tailYaw(Math.sin(time * 0.85) * 0.07 - turnRate * 0.075
        + Math.sin(gait - 0.7) * 0.035 * walkBlend, dt);
      tail.rotation.x = tailPitch(Math.sin(time * 0.65 + 1.2) * 0.025 + acceleration * 0.022, dt);
      legs.forEach((leg, index) => {
        const step = Math.sin(gait + index * Math.PI);
        leg.position.z = damp(leg.position.z, step * (0.085 * walkBlend + 0.025 * turnBlend), 18);
        leg.position.y = Math.max(0, step) * (0.035 * walkBlend + 0.055 * turnBlend);
        leg.rotation.y = damp(leg.rotation.y, Math.max(0, step) * Math.sign(turnRate) * 0.16 * turnBlend, 14);
        arms[index]!.rotation.x = damp(arms[index]!.rotation.x, -step * 0.23 * walkBlend - observeBlend * 0.08, 10);
      });
    },
  };
}
