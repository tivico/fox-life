import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CharacterState, IdleVariation } from './Character.ts';
import type { SleepPhase } from './sleep.ts';
import type { ReadPhase } from './read.ts';
import { createDailyVisual } from './dailyVisual.ts';
import type { CleanMode, DailyKind } from './daily.ts';
import { createFoxPerformance } from './FoxPerformance.ts';
import { createLivingVisual } from './LivingVisual.ts';
import type { LivingSnapshot } from './LivingActivity.ts';

/** Fox-specific geometry; behavior only knows Character states. */
export function createFoxVisual() {
  const root = new THREE.Group();
  root.name = 'FoxVisual';
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
  const sleepBounds: Array<{ geometry: THREE.BufferGeometry; standing: THREE.Box3; sleeping: THREE.Box3 }> = [];
  function sleepMorph(geometry: THREE.BufferGeometry, positions: THREE.BufferAttribute) {
    const posed = geometry.clone();
    posed.setAttribute('position', positions);
    posed.computeVertexNormals();
    geometry.morphAttributes.position = [positions];
    geometry.morphAttributes.normal = [posed.getAttribute('normal').clone()];
    const standing = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position') as THREE.BufferAttribute);
    const sleeping = new THREE.Box3().setFromBufferAttribute(positions);
    geometry.boundingBox = standing.clone();
    sleepBounds.push({ geometry, standing, sleeping });
    posed.dispose();
  }
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
  eyes.name = 'FoxEyes';
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
  const sleepingLegs: THREE.Mesh[] = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = sign < 0 ? 'FoxArmL' : 'FoxArmR';
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
    // Bend the existing continuous leg surface into a curl, without adding joints
    // or changing the standing mesh. The two feet have staggered curl amounts.
    const curled = legPositions.clone();
    for (let i = 0; i < curled.count; i++) {
      const y = legPositions.getY(i), reach = Math.max(0, 0.49 - y);
      const bend = (sign < 0 ? 0.55 : 0.43) * reach / 0.49;
      curled.setY(i, 0.49 - reach * Math.cos(bend));
      curled.setZ(i, legPositions.getZ(i) + reach * Math.sin(bend));
    }
    sleepMorph(legGeometry, curled);
    const legMesh = new THREE.Mesh(legGeometry, painted);
    leg.add(legMesh);
    sleepingLegs.push(legMesh);
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
  // A bed-only crescent rests behind the hips and wraps around the feet.
  // Preserve the same topology and cream tip, instead of rotating the standing brush.
  const restingTail = tailGeometry.getAttribute('position').clone();
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const radius = ring === rings ? 0 : 0.14 * (1 - t) + 0.33 * Math.pow(Math.sin(Math.PI * t), 0.85);
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      restingTail.setXYZ(ring * sides + side,
        -0.04 + Math.cos(angle) * radius * 0.68,
        -0.85 * t,
        -0.10 * Math.sin(Math.PI * t) + 0.22 * t * t - Math.sin(angle) * radius * 0.60);
    }
  }
  sleepMorph(tailGeometry, restingTail);
  const tailMesh = new THREE.Mesh(tailGeometry, [fur, cream]);
  tail.add(tailMesh);
  // A visual-only open book, held in the existing arm hierarchy's reach.
  const book = new THREE.Group();
  book.name = 'ReadingBook';
  book.visible = false;
  book.scale.setScalar(0);
  book.position.set(0, 0.72, 0.415);
  book.rotation.x = 0.20;
  body.add(book);
  const cover = new THREE.MeshStandardMaterial({ color: '#925d48', roughness: 1 });
  const paper = new THREE.MeshStandardMaterial({ color: '#f2e5c6', roughness: 1 });
  const halves: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const half = new THREE.Group();
    half.rotation.z = sign * 1.50;
    for (const [w, h, d, y, material] of [
      [0.255, 0.018, 0.33, -0.022, cover], [0.24, 0.026, 0.31, 0, paper],
    ] as const) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(sign * 0.125, y, 0);
      half.add(mesh);
    }
    book.add(half); halves.push(half);
  }
  const page = new THREE.Group();
  page.name = 'ReadingPage';
  page.position.y = 0.025;
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.004, 0.24), paper);
  leaf.position.set(0.105, 0, 0.035);
  page.add(leaf); book.add(page);
  book.traverse(object => {
    if (object instanceof THREE.Mesh) {
      // Raycaster does not automatically skip invisible ancestors.
      object.raycast = function (raycaster, intersects) {
        if (book.visible) THREE.Mesh.prototype.raycast.call(this, raycaster, intersects);
      };
    }
  });
  // Eat-only props, tucked away at zero scale outside the dedicated pose.
  const meal = new THREE.Group();
  meal.name = 'EatingBowl';
  // Reserve space for the projecting overall bib, not just the pear torso.
  meal.position.set(-0.10, 0.65, 0.49);
  meal.visible = false; meal.scale.setScalar(0); body.add(meal);
  const dish = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.10, 0), new THREE.Vector2(0.19, 0.10),
    new THREE.Vector2(0.17, 0.10), new THREE.Vector2(0.08, 0.02), new THREE.Vector2(0, 0.02),
  ], 20), cream);
  meal.add(dish);
  const biscuitMaterial = new THREE.MeshStandardMaterial({ color: '#ce9555', roughness: 1 });
  ellipsoid(meal, biscuitMaterial, [0.09, 0.04, 0.08], [0, 0.06, 0]);
  const bite = new THREE.Group();
  bite.name = 'EatingBite'; bite.visible = false; bite.scale.setScalar(0);
  bite.position.set(0.05, -0.35, 0.04); arms[1]!.add(bite);
  ellipsoid(bite, biscuitMaterial, [0.065, 0.045, 0.055], [0, 0, 0]);
  for (const prop of [meal, bite]) prop.traverse(object => {
    if (object instanceof THREE.Mesh) object.raycast = function (raycaster, intersects) {
      if (prop.visible) THREE.Mesh.prototype.raycast.call(this, raycaster, intersects);
    };
  });
  const daily = createDailyVisual({ root, body, head, eyes, arms, legs, tail, book, page });
  const performance = createFoxPerformance();
  const livingVisual = createLivingVisual({ root, body, head, eyes, arms, legs, tail });
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
  const sleepRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, -Math.PI / 2, 0));
  const neutralRotation = new THREE.Quaternion();
  // Remove last frame's Read overlay before running the accepted baseline pose.
  // Otherwise damping would retain a held-book arm/head offset after PutAway.
  const readOffsets = { headX: 0, headY: 0, bodyX: 0, bodyZ: 0, eyesX: 0, arms: [0, 0] };
  const eatOffsets = { headX: 0, headY: 0, bodyX: 0, arms: [0, 0], armRoll: [0, 0] };
  return {
    root,
    dispose() { performance.dispose(); daily.dispose(); },
    animate({ dt, time, distance, state, variation, turnRate = 0, headingError = 0, preparingObserve = false,
      sleepPose = 0, sleepPhase = null, sleepTime = 0, readPose = 0, readPhase = null, readTime = 0,
      eatPose = 0, eatTime = 0, dailyKind = null, dailyPose = 0, dailyTime = 0, dozePose = 0,
      cleanMode, cleanPark, cleanParkYaw = 0, living = null }: {
      dt: number; time: number; distance: number; state: CharacterState;
      variation: IdleVariation; observeTime: number; turnRate?: number; headingError?: number; preparingObserve?: boolean;
      sleepPose?: number; sleepPhase?: SleepPhase | null; sleepTime?: number;
      readPose?: number; readPhase?: ReadPhase | null; readTime?: number;
      eatPose?: number; eatTime?: number;
      dailyKind?: DailyKind | null; dailyPose?: number; dailyTime?: number; dozePose?: number;
      cleanMode?: CleanMode; cleanPark?: THREE.Vector3; cleanParkYaw?: number;
      living?: LivingSnapshot | null;
    }) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 0.05);
      const expression = performance.update(state, dt);
      livingVisual.restore();
      daily.restore();
      head.rotation.x -= eatOffsets.headX; head.rotation.y -= eatOffsets.headY;
      body.rotation.x -= eatOffsets.bodyX;
      arms.forEach((arm, i) => {
        arm.rotation.x -= eatOffsets.arms[i]!;
        arm.rotation.z -= eatOffsets.armRoll[i]!;
      });
      eatOffsets.headX = eatOffsets.headY = eatOffsets.bodyX = 0; eatOffsets.arms.fill(0);
      eatOffsets.armRoll.fill(0);
      head.rotation.x -= readOffsets.headX; head.rotation.y -= readOffsets.headY;
      body.rotation.x -= readOffsets.bodyX; body.rotation.z -= readOffsets.bodyZ;
      eyes.position.x -= readOffsets.eyesX;
      arms.forEach((arm, i) => { arm.rotation.x -= readOffsets.arms[i]!; });
      readOffsets.headX = readOffsets.headY = readOffsets.bodyX = readOffsets.bodyZ = readOffsets.eyesX = 0;
      readOffsets.arms.fill(0);
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
      const glance = state === 'Observe' ? expression.gaze : 0;
      head.rotation.y = damp(head.rotation.y, expression.gaze * lookBlend
        + glance + THREE.MathUtils.clamp(headingError * 0.65, -0.48, 0.48), 12);
      head.rotation.x = damp(head.rotation.x, -0.13 * observeBlend + expression.nod + breath * 0.012, 5);
      eyes.position.x = damp(eyes.position.x, expression.gaze * .02 + glance * .006);
      eyes.scale.y = expression.eyes;
      ears.forEach((ear, index) => {
        ear.rotation.x = earMotion[index]!((index === 0 ? expression.earLeft : expression.earRight)
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
      // Bed-only choreography: lift at the foot first, then roll onto the mattress.
      // Reversing the same continuous path also handles interruption during settle.
      const p = THREE.MathUtils.smootherstep(sleepPose, 0, 1);
      sleepingLegs.forEach(mesh => { mesh.morphTargetInfluences![0] = p; });
      tailMesh.morphTargetInfluences![0] = p;
      // Three's default bounds union every morph, even when its weight is zero.
      // Blend conservative endpoint bounds so standing queries retain standing extents.
      sleepBounds.forEach(({ geometry, standing, sleeping }) => {
        geometry.boundingBox!.min.copy(standing.min).lerp(sleeping.min, p);
        geometry.boundingBox!.max.copy(standing.max).lerp(sleeping.max, p);
      });
      const roll = THREE.MathUtils.smootherstep(sleepPose, 0.5, 1);
      root.quaternion.copy(neutralRotation).slerp(sleepRotation, roll);
      root.position.set(0.25 * p, 0.71 * THREE.MathUtils.smootherstep(sleepPose, 0, 0.5) + 0.38 * Math.sin(Math.PI * p), 0.82 * p);
      if (p > 0) {
        const rest = Math.sin(time * 1.1) * 0.005;
        body.scale.y = THREE.MathUtils.lerp(body.scale.y, 1 + rest, p);
        body.position.y *= 1 - p;
        body.rotation.x *= 1 - p;
        body.rotation.z *= 1 - p;
        // In the side-lying pose, local -X lifts away from the mattress.
        // Support the head on the pillow and tuck the lower arm/tail above the bed.
        head.position.x = -0.30 * p;
        head.position.y = 1.14 - 0.035 * p;
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0.10, p);
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.08, p);
        eyes.scale.y = THREE.MathUtils.lerp(eyes.scale.y, 0.07, p);
        if (sleepPhase === 'wake') head.rotation.z = -0.12 * Math.sin(Math.PI * Math.min(1, sleepTime / 0.75));
        else head.rotation.z *= 1 - p;
        tail.rotation.x *= 1 - p;
        tail.rotation.y *= 1 - p;
        tail.position.x = 0;
        tail.position.z = -0.10 - 0.10 * p;
        ears.forEach((ear, index) => {
          ear.rotation.x = THREE.MathUtils.lerp(ear.rotation.x, -0.35, p);
          ear.rotation.z = THREE.MathUtils.lerp(index === 0 ? 0.15 : -0.15, index === 0 ? 0.50 : 1.10, p);
        });
        legs.forEach((leg, index) => {
          leg.position.y *= 1 - p;
          leg.position.z *= 1 - p;
          leg.rotation.y *= 1 - p;
          arms[index]!.rotation.x = THREE.MathUtils.lerp(arms[index]!.rotation.x, index === 0 ? -0.95 : -0.65, p);
          arms[index]!.position.x = (index === 0 ? -0.22 : 0.22 - 0.13 * p);
          arms[index]!.position.z = (index === 0 ? 0.12 : 0.08) * p;
        });
      } else {
        head.position.x = 0; head.position.y = 1.14; head.rotation.z = 0; tail.position.x = 0; tail.position.z = -0.10;
        ears.forEach((ear, index) => { ear.rotation.z = index === 0 ? 0.15 : -0.15; });
        arms.forEach((arm, index) => { arm.position.x = index === 0 ? -0.22 : 0.22; arm.position.z = 0; });
      }
      const reading = p === 0 ? THREE.MathUtils.smootherstep(readPose, 0, 1) : 0;
      book.visible = reading > 0;
      book.scale.setScalar(reading);
      book.rotation.x = 0.20;
      halves.forEach((half, index) => { half.rotation.z = (index === 0 ? -1 : 1) * (0.10 + (1 - reading) * 1.40); });
      if (readPhase === 'read') {
        // One quiet page turn followed by a pause; no continuous flapping.
        page.rotation.z = Math.PI * THREE.MathUtils.smootherstep(readTime, 3.0, 3.85);
      } else if (!book.visible) page.rotation.z = 0;
      // A modest curled-page silhouette stays below the lowered muzzle.
      page.scale.x = 1 - 0.75 * Math.sin(page.rotation.z);
      if (reading > 0) {
        readOffsets.headX = (0.38 + Math.sin(time * 0.8) * 0.012 - head.rotation.x) * reading;
        readOffsets.headY = -head.rotation.y * reading;
        readOffsets.eyesX = -eyes.position.x * reading;
        readOffsets.bodyX = -body.rotation.x * reading;
        readOffsets.bodyZ = -body.rotation.z * reading;
        head.rotation.x += readOffsets.headX; head.rotation.y += readOffsets.headY;
        eyes.position.x += readOffsets.eyesX;
        body.rotation.x += readOffsets.bodyX; body.rotation.z += readOffsets.bodyZ;
        arms.forEach((arm, i) => { readOffsets.arms[i] = (-1.30 - arm.rotation.x) * reading; arm.rotation.x += readOffsets.arms[i]!; });
      }
      const eating = p === 0 && reading === 0 ? THREE.MathUtils.smootherstep(eatPose, 0, 1) : 0;
      meal.visible = bite.visible = eating > 0;
      meal.scale.setScalar(eating);
      // Three unequal phrases: reach, bring to muzzle, chew, then a quiet pause.
      // Finish freezes this motion time and fades the exact interrupted pose.
      let lift = 0, chew = 0, morsel = 1;
      for (const start of [0.25, 2.05, 4.30]) {
        const t = eatTime - start;
        lift += THREE.MathUtils.smootherstep(t, 0, 0.45) * (1 - THREE.MathUtils.smootherstep(t, 0.80, 1.20));
        chew += Math.sin(Math.max(0, t - 0.65) * 18) * THREE.MathUtils.smoothstep(t, 0.65, 0.85)
          * (1 - THREE.MathUtils.smoothstep(t, 1.25, 1.65));
        if (t >= 0 && t < 1.8) morsel = 1 - THREE.MathUtils.smoothstep(t, 0.65, 0.85)
          + THREE.MathUtils.smoothstep(t, 1.35, 1.65);
      }
      bite.scale.setScalar(eating * morsel);
      if (eating > 0) {
        eatOffsets.headX = (0.30 - 0.10 * lift + 0.015 * chew - head.rotation.x) * eating;
        eatOffsets.headY = (0.01 * lift - head.rotation.y) * eating;
        eatOffsets.bodyX = (0.025 + 0.02 * lift - body.rotation.x) * eating;
        head.rotation.x += eatOffsets.headX; head.rotation.y += eatOffsets.headY;
        body.rotation.x += eatOffsets.bodyX;
        arms.forEach((arm, i) => {
          // Lift above the bowl rim before moving the paw inward.
          const target = i === 0 ? -1.18 : -0.85 - 0.87 * THREE.MathUtils.smootherstep(lift, 0, 0.85);
          eatOffsets.arms[i] = (target - arm.rotation.x) * eating;
          arm.rotation.x += eatOffsets.arms[i]!;
          // Bring the entire paw and its attached morsel to the lower muzzle.
          // The proximal arm still overlaps the shoulder; no detached food path.
          eatOffsets.armRoll[i] = i === 0 ? 0 : (-0.72 - arm.rotation.z) * lift * eating;
          arm.rotation.z += eatOffsets.armRoll[i]!;
          // Clear the cheek on the way in/out before closing toward the muzzle.
          arm.position.z += (i === 0 ? 0.07 : 0.21 * lift + 0.09 * Math.sin(Math.PI * lift)) * eating;
        });
      }
      daily.animate(dailyKind, dailyPose, dailyKind ? dailyTime : readTime, dozePose, dt, cleanMode, cleanPark, cleanParkYaw);
      livingVisual.animate(living);
    },
  };
}
