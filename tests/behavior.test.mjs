import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character, ARRIVAL_DISTANCE } from '../src/Character.ts';
import { characterLayout, createScene } from '../src/scene.ts';
import { FrameClock } from '../src/FrameClock.ts';
import { bindClickInteraction } from '../src/ClickInteraction.ts';

const step = 1 / 60;
function seeded(seed = 42) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const makeCharacter = () => new Character(characterLayout, seeded());

test('30/60/90/135/180 degree turns in both directions advance forward and arrive across frame rates', () => {
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) for (const degrees of [30, 60, 90, 135, 180]) for (const sign of [-1, 1]) {
    const offset = sign * THREE.MathUtils.degToRad(degrees);
    const character = makeCharacter();
    character.root.rotation.y = Math.PI + offset;
    character.requestWindowObserve();
    let earlyAdvance = false;
    let stepping = false;
    character.update(dt);
    const head = character.root.getObjectByName('FoxHead');
    const error = Math.atan2(Math.sin(Math.PI - character.root.rotation.y), Math.cos(Math.PI - character.root.rotation.y));
    assert.ok(head.rotation.y * error > 0, 'head looks toward target, not opposite the turn');
    for (let i = 0; i < Math.ceil(12 / dt) && character.state !== 'Observe'; i++) {
      const before = character.root.position.clone();
      character.update(dt);
      assert.ok(Math.abs(head.rotation.y) <= 0.481, 'head lead stays below 28 degrees relative to body');
      const delta = character.root.position.clone().sub(before);
      const forward = new THREE.Vector3(Math.sin(character.root.rotation.y), 0, Math.cos(character.root.rotation.y));
      assert.ok(delta.dot(forward) >= -1e-9);
      assert.ok(delta.clone().cross(forward).length() < 1e-9, 'no lateral root sliding');
      const target = character.target.clone().sub(before);
      const remainingAngle = Math.abs(Math.atan2(Math.sin(Math.atan2(target.x, target.z) - character.root.rotation.y), Math.cos(Math.atan2(target.x, target.z) - character.root.rotation.y)));
      if (remainingAngle > 0.35 && delta.length() > 0.0001) earlyAdvance = true;
      if (delta.length() < dt * 0.1 && Math.max(character.root.getObjectByName('FoxLegL').position.y,
        character.root.getObjectByName('FoxLegR').position.y) > 0.012) stepping = true;
    }
    assert.ok(earlyAdvance, 'start moving while more than 20 degrees off target');
    if (degrees >= 90) assert.ok(stepping, 'large slow pivot has visible foot lift');
    assert.equal(character.state, 'Observe');
    assert.ok(Math.cos(character.root.rotation.y - characterLayout.windowHeading) > 0.999);
  }
});

test('curved approaches from activity corners remain clear of room furniture', () => {
  const { scene } = createScene();
  scene.updateMatrixWorld(true);
  const blockers = [];
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(object);
      if (box.max.y > 0.05) blockers.push(box);
    }
  });
  const b = characterLayout.bounds;
  for (const x of [b.minX, b.maxX]) for (const z of [b.minZ, b.maxZ]) for (const degrees of [30, 60, 90, 135, 180]) for (const sign of [-1, 1]) {
    const heading = Math.atan2(-x, characterLayout.windowPosition.z - z) + sign * THREE.MathUtils.degToRad(degrees);
    const character = makeCharacter();
    character.root.position.set(x, 0, z);
    character.root.rotation.y = heading;
    character.requestWindowObserve();
    for (let i = 0; i < 900 && character.state !== 'Observe'; i++) {
      character.update(step);
      if (i % 6 === 0) {
        const box = new THREE.Box3().setFromObject(character.root);
        assert.ok(box.min.y >= -0.001);
        assert.ok(!blockers.some(blocker => blocker.intersectsBox(box)), `curved route collision from ${x},${z},${heading}`);
      }
    }
    assert.equal(character.state, 'Observe');
  }
});

test('small corrections do not march; large pivots alternate feet and settle without head displacement', async () => {
  const { createFoxVisual } = await import('../src/createFoxVisual.ts');
  for (const degrees of [5, 15, 30, 90, 135, 180]) {
    const visual = createFoxVisual();
    const head = visual.root.getObjectByName('FoxHead');
    const anchor = head.position.clone();
    const feet = ['FoxLegL', 'FoxLegR'].map(name => visual.root.getObjectByName(name));
    const peaks = [0, 0];
    for (let frame = 0; frame < 120; frame++) {
      visual.animate({dt: step, time: frame * step, distance: 0, state: 'Walk', variation: 'Breathe',
        observeTime: 0, turnRate: 2, headingError: THREE.MathUtils.degToRad(degrees)});
      feet.forEach((foot, index) => { peaks[index] = Math.max(peaks[index], foot.position.y); });
      assert.deepEqual(head.position.toArray(), anchor.toArray());
      assert.ok(Math.abs(head.rotation.y) <= 0.48 + 1e-9);
    }
    if (degrees <= 30) assert.deepEqual(peaks, [0, 0], 'minor heading correction adds no pivot lift');
    else assert.ok(peaks.every(peak => peak > 0.025), 'both feet take turns lifting');
    for (let frame = 0; frame < 120; frame++) visual.animate({dt: step, time: 2 + frame * step,
      distance: 0, state: 'Idle', variation: 'Breathe', observeTime: 0});
    assert.ok(feet.every(foot => foot.position.length() < 0.141 && Math.abs(foot.rotation.y) < 0.001));
  }
});

test('gait cadence follows distance and pose changes stay bounded through start, stop and command interruption', async () => {
  const { createFoxVisual } = await import('../src/createFoxVisual.ts');
  const cycles = [];
  for (const speed of [0.35, 0.7]) {
    const visual = createFoxVisual();
    const foot = visual.root.getObjectByName('FoxLegL');
    let previous = 0;
    let count = 0;
    for (let i = 0; i < 600; i++) {
      visual.animate({dt: step, time: i * step, distance: speed * step, state: 'Walk', variation: 'Breathe', observeTime: 0});
      if (i > 120 && previous <= 0 && foot.position.z > 0) count++;
      previous = foot.position.z;
    }
    cycles.push(count);
  }
  assert.ok(cycles[1] >= cycles[0] * 1.7 && cycles[1] <= cycles[0] * 2.3, 'double translation speed gives about double cadence');
  const character = makeCharacter();
  const objects = [];
  character.root.traverse(object => objects.push(object));
  let previous = objects.map(object => ({position: object.position.clone(), quaternion: object.quaternion.clone()}));
  let interrupted = false;
  const transitions = new Set();
  for (let frame = 0; frame < 2400; frame++) {
    const state = character.state;
    if (!interrupted && frame > 700 && state === 'Walk') { character.requestWindowObserve(); interrupted = true; }
    character.update(step);
    if (state !== character.state) transitions.add(`${state}->${character.state}`);
    objects.forEach((object, index) => {
      assert.ok(object.position.distanceTo(previous[index].position) < 0.04, 'no one-frame position snap');
      assert.ok(object.quaternion.angleTo(previous[index].quaternion) < 0.18, 'no one-frame pose rotation snap');
    });
    previous = objects.map(object => ({position: object.position.clone(), quaternion: object.quaternion.clone()}));
  }
  assert.ok(interrupted);
  for (const transition of ['Idle->Walk', 'Walk->Idle', 'Walk->Observe', 'Observe->Idle']) assert.ok(transitions.has(transition), transition);
});
function until(character, condition, limit = 1800) {
  let frames = 0;
  while (!condition() && frames++ < limit) character.update(step);
  assert.ok(condition(), 'condition must be reached within bounded simulation time');
  return frames * step;
}
function invariants(character) {
  if (character.state === 'Idle') {
    assert.equal(character.source, 'Autonomous');
    assert.equal(character.target, null);
    assert.equal(character.action, 'Autonomous idle');
  } else assert.ok(character.target);
  if (character.state === 'Observe') {
    assert.equal(character.source, 'Player Command');
    assert.equal(character.action, 'Observe environment');
  }
}

test('60 seconds autonomous: multiple safe destinations, both idle variations, consistent debug data', () => {
  const character = makeCharacter();
  const variations = new Set();
  const targets = new Set();
  for (let frame = 0; frame < 3600; frame++) {
    character.update(step);
    invariants(character);
    if (character.state === 'Idle') variations.add(character.idleVariation);
    if (character.target) targets.add(character.target.toArray().join(','));
    const { x, z } = character.root.position;
    const b = characterLayout.bounds;
    assert.ok(x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
  }
  assert.equal(variations.size, 2);
  assert.ok(targets.size >= 5, `expected varied destinations, received ${targets.size}`);
});

for (const initialState of ['Idle', 'Walk']) {
  test(`window command interrupts autonomous ${initialState} within 0.5 seconds`, () => {
    const character = makeCharacter();
    until(character, () => character.state === initialState);
    const before = character.root.position.clone();
    const heading = character.root.rotation.y;
    assert.equal(character.requestWindowObserve(), true);
    assert.equal(character.action, 'Walk to window');
    assert.equal(character.source, 'Player Command');
    assert.deepEqual(character.target.toArray(), characterLayout.windowPosition.toArray());
    assert.deepEqual(character.root.position.toArray(), before.toArray(), 'no teleport at acceptance');
    for (let frame = 0; frame < 30; frame++) character.update(step);
    assert.ok(character.root.position.distanceTo(before) > 0.005 || Math.abs(character.root.rotation.y - heading) > 0.01);
  });
}

test('three different starts complete approach, facing, full Observe, clear command, leave window', () => {
  for (const start of [[-1.6, 0, 1.3], [1.6, 0, 0.8], [0.8, 0, -1]]) {
    const character = makeCharacter();
    character.root.position.fromArray(start);
    character.requestWindowObserve();
    let previous = character.root.position.clone();
    let previousAngle = character.root.rotation.y;
    for (let frame = 0; character.state !== 'Observe' && frame < 1800; frame++) {
      character.update(step);
      assert.ok(character.root.position.distanceTo(previous) <= 1.05 * step + 1e-8);
      assert.ok(Math.abs(character.root.rotation.y - previousAngle) <= 3.6 * step + 1e-8);
      previous.copy(character.root.position);
      previousAngle = character.root.rotation.y;
      invariants(character);
    }
    assert.equal(character.state, 'Observe');
    assert.ok(character.root.position.distanceTo(characterLayout.windowPosition) <= ARRIVAL_DISTANCE);
    assert.ok(Math.cos(character.root.rotation.y - Math.PI) > 0.999);
    assert.equal(character.observeElapsed, 0);
    const atWindow = character.root.position.clone();
    const duration = until(character, () => character.state === 'Idle');
    assert.ok(duration >= 4 && duration <= 4 + step * 2);
    assert.deepEqual(character.root.position.toArray(), atWindow.toArray());
    invariants(character);
    until(character, () => character.root.position.distanceTo(atWindow) > 0.6);
    assert.equal(character.source, 'Autonomous');
  }
});

test('repeat clicks cannot queue, overwrite target, restart or extend Observe', () => {
  const character = makeCharacter();
  character.requestWindowObserve();
  for (let i = 0; i < 30; i++) {
    character.update(step);
    assert.equal(character.requestWindowObserve(), false);
    assert.deepEqual(character.target.toArray(), characterLayout.windowPosition.toArray());
  }
  until(character, () => character.state === 'Observe');
  let duration = 0;
  while (character.state === 'Observe') {
    const timer = character.observeElapsed;
    assert.equal(character.requestWindowObserve(), false);
    assert.equal(character.observeElapsed, timer);
    character.update(step);
    duration += step;
  }
  assert.ok(duration >= 4 && duration < 4.04);
  assert.equal(character.target, null);
  assert.equal(character.requestWindowObserve(), true, 'new click can start a new command');
});

test('already at station turns in place, no detour or snap', () => {
  const character = makeCharacter();
  character.root.position.copy(characterLayout.windowPosition);
  character.requestWindowObserve();
  until(character, () => character.state === 'Observe');
  assert.deepEqual(character.root.position.toArray(), characterLayout.windowPosition.toArray());
});

test('character envelope clears actual walls/furniture along approach segments at every sampled heading', () => {
  const { scene } = createScene();
  const blockers = [];
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(object);
      if (box.max.y > 0.05) blockers.push(box); // Floor/rug contact is intentional.
    }
  });
  const character = makeCharacter();
  const b = characterLayout.bounds;
  for (const x of [b.minX, 0, b.maxX]) for (const z of [b.minZ, 0, b.maxZ]) {
    const origin = new THREE.Vector3(x, 0, z);
    for (let t = 0; t <= 1; t += 0.25) for (let heading = 0; heading < 16; heading++) {
      character.root.position.lerpVectors(origin, characterLayout.windowPosition, t);
      character.root.rotation.y = heading * Math.PI / 8;
      const envelope = new THREE.Box3().setFromObject(character.root);
      assert.ok(envelope.min.y >= -0.001, 'feet do not sink under floor');
      assert.ok(!blockers.some(box => box.intersectsBox(envelope)),
        `blocked approach at ${character.root.position.toArray()}, heading ${heading}`);
    }
  }
});

test('background/resume preserves approach and Observe; no accumulated hidden time', () => {
  for (const state of ['Walk', 'Observe']) {
    const character = makeCharacter();
    const clock = new FrameClock();
    character.requestWindowObserve();
    until(character, () => character.state === state);
    const before = character.root.position.clone();
    const timer = character.observeElapsed;
    clock.tick(1000, false);
    character.update(clock.tick(61000, true));
    clock.reset(); // Real visibilitychange handler also resets on return.
    character.update(clock.tick(121000, false));
    assert.deepEqual(character.root.position.toArray(), before.toArray());
    assert.equal(character.observeElapsed, timer);
    assert.equal(character.state, state);
    assert.equal(clock.tick(121016, false), 0.016);
    assert.equal(clock.tick(131016, false), 0.05);
    until(character, () => character.state === 'Idle');
  }
});

test('visible window frame/glass hit; occluder, drag, cancel, other surfaces do not', () => {
  class Canvas extends EventTarget {
    getBoundingClientRect() { return { left: 100, top: 50, width: 400, height: 400 }; }
  }
  const canvas = new Canvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
  camera.position.z = 5;
  const pane = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.2));
  frame.position.x = 0.58;
  scene.add(pane, frame);
  let hits = 0;
  const dispose = bindClickInteraction(canvas, camera, scene, [pane, frame], () => hits++);
  const event = (type, x, y, extra = {}) => {
    const value = new Event(type);
    Object.assign(value, { clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, ...extra });
    canvas.dispatchEvent(value);
  };
  const click = (x, y) => { event('pointerdown', x, y); event('pointerup', x, y); };
  click(300, 250);
  click(356, 250);
  assert.equal(hits, 2, 'glass and frame share one intent');
  click(480, 430);
  event('pointerdown', 300, 250);
  event('pointermove', 330, 250);
  event('pointermove', 300, 250);
  event('pointerup', 300, 250);
  event('pointerdown', 300, 250);
  event('pointercancel', 300, 250);
  event('pointerup', 300, 250);
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2));
  blocker.position.z = 1;
  scene.add(blocker);
  click(300, 250);
  assert.equal(hits, 2, 'nearest non-window surface blocks interaction');
  dispose();
  scene.remove(blocker);
  click(300, 250);
  assert.equal(hits, 2, 'listeners released');
});

test('arrival settle stays in Walk, accepts no duplicate, then preserves four full Observe seconds', () => {
  const character = makeCharacter();
  character.root.position.copy(characterLayout.windowPosition);
  character.root.rotation.y = characterLayout.windowHeading;
  character.requestWindowObserve();
  for (let frame = 0; frame < 6; frame++) {
    character.update(step);
    assert.equal(character.state, 'Walk');
    assert.equal(character.observeElapsed, 0);
    assert.equal(character.requestWindowObserve(), false);
  }
  const remaining = until(character, () => character.state === 'Observe');
  assert.ok(remaining >= 0.07 && remaining <= 0.12);
  const duration = until(character, () => character.state === 'Idle');
  assert.ok(duration >= 4 && duration <= 4 + 2 * step);
  assert.deepEqual(character.root.position.toArray(), characterLayout.windowPosition.toArray());
});

test('turn easing and secondary motion stay finite across frame rates, with lag that settles', async () => {
  const { createFoxVisual } = await import('../src/createFoxVisual.ts');
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
    const character = makeCharacter();
    character.requestWindowObserve();
    let previousHeading = character.root.rotation.y;
    let firstRate = null;
    let peakRate = 0;
    for (let i = 0; i < Math.ceil(12 / dt); i++) {
      character.update(dt);
      const rate = Math.abs(character.root.rotation.y - previousHeading) / dt;
      firstRate ??= rate;
      peakRate = Math.max(peakRate, rate);
      assert.ok(rate <= 3.6 + 1e-8);
      previousHeading = character.root.rotation.y;
      character.root.traverse(object => {
        assert.ok([...object.position, object.rotation.x, object.rotation.y, object.rotation.z, ...object.scale].every(Number.isFinite));
      });
      assert.ok(new THREE.Box3().setFromObject(character.root).min.y >= -0.001);
    }
    assert.ok(firstRate < peakRate * 0.6, 'turn builds speed rather than jumping to max rate');
    const visual = createFoxVisual();
    const tail = visual.root.getObjectByName('FoxTail');
    const animate = turnRate => visual.animate({dt, time: 0, distance: 0, state: 'Idle', variation: 'Breathe', observeTime: 0, turnRate});
    for (let i = 0; i < Math.ceil(0.5 / dt); i++) animate(3);
    const deflected = tail.rotation.y;
    assert.ok(Math.abs(deflected) > 0.1 && Math.abs(deflected) < 0.35);
    animate(0);
    assert.ok(Math.abs(tail.rotation.y) > 0.08, 'tail retains follow-through after turn stops');
    for (let i = 0; i < Math.ceil(2 / dt); i++) animate(0);
    assert.ok(Math.abs(tail.rotation.y) < 0.001, 'tail settles without accumulating rotation');
    assert.deepEqual(visual.root.position.toArray(), [0, 0, 0]);
  }
});
