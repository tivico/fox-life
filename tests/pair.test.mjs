import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { kitchenHomeLayout, companionLayout, createScene } from '../src/scene.ts';
import { Household } from '../src/Household.ts';
import { foxLooks } from '../src/createFoxVisual.ts';
import { PairPlanner, PAIR, PAW } from '../src/Pair.ts';
import { LifeJournal, lifePresentation } from '../src/life.ts';
import { roomAt, homeRooms } from '../src/HomeNavigation.ts';
import { createHomeView, FOLLOW_BIAS } from '../src/HomeView.ts';

const dt = 1 / 60;
const lcg = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
function home({ a = () => .45, b = () => .45, pairs = () => .99 } = {}) {
  const household = new Household();
  const orange = new Character(kitchenHomeLayout, a, { name: '小橘', household });
  const white = new Character(companionLayout, b, { name: '小白', look: foxLooks.white, household });
  white.root.position.set(-.9, 0, 5.6); white.yieldTo(orange);
  return { orange, white, pairs: new PairPlanner([orange, white], pairs), journal: new LifeJournal(), tick: 0 };
}
function step(h, seconds, each = () => {}) {
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    h.orange.update(dt); h.white.update(dt); h.pairs.update(dt);
    for (const fox of [h.orange, h.white]) h.journal.observe(fox, 1_700_000_000_000 + h.tick++);
    each();
  }
}
function until(h, predicate, seconds = 60, each = () => {}) {
  for (let i = 0; i < seconds / dt; i++) { step(h, dt, each); if (predicate()) return; }
  assert.fail(`timed out: ${h.orange.action} / ${h.white.action}`);
}
const nose = fox => { const head = fox.root.getObjectByName('FoxHead'); head.updateWorldMatrix(true, false); return head.localToWorld(new THREE.Vector3(0, -.075, .46)); };
const headCentre = fox => { const head = fox.root.getObjectByName('FoxHead'); head.updateWorldMatrix(true, false); return head.getWorldPosition(new THREE.Vector3()); };
const innerArm = (fox, other) => {
  const near = arm => arm.getWorldPosition(new THREE.Vector3()).distanceTo(other.root.position);
  const [left, right] = ['FoxArmL', 'FoxArmR'].map(name => fox.root.getObjectByName(name));
  return near(left) < near(right) ? left : right;
};
const paw = (fox, other) => {
  const arm = innerArm(fox, other);
  return arm.localToWorld(PAW.clone().setX(arm.name === 'FoxArmL' ? -PAW.x : PAW.x));
};
const surface = object => {
  object.updateWorldMatrix(true, true);
  const points = [];
  object.traverse(mesh => {
    if (!(mesh instanceof THREE.Mesh)) return;
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += 2) points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  });
  return points;
};
const apart = (a, b) => { let least = Infinity; for (const p of a) for (const q of b) least = Math.min(least, p.distanceToSquared(q)); return Math.sqrt(least); };
const both = (h, phase) => h.orange.together?.phase === phase && h.white.together?.phase === phase;
const free = h => h.orange.state === 'Idle' && h.white.state === 'Idle' && !h.orange.together && !h.white.together;

test('boop: the other fox comes over from another room, noses touch without heads overlapping, and the diary keeps one line', () => {
  const h = home();
  assert.equal(h.pairs.invite('Boop', h.orange), 'accepted');
  assert.equal(h.orange.source, 'Player Command'); assert.equal(h.white.source, 'Player Command');
  assert.equal(lifePresentation(h.white).title, '走向小橘，打個招呼');
  until(h, () => both(h, 'active'));
  // Each fox stops within its arrival distance, so the spacing can be off by two of them.
  const gap = h.orange.root.position.distanceTo(h.white.root.position);
  assert.ok(Math.abs(gap - PAIR.Boop.gap) < .075, `spacing ${gap.toFixed(3)}`);
  assert.equal(roomAt(h.white.root.position), 'Bedroom');
  const turn = h.orange.root.rotation.y - h.white.root.rotation.y;
  assert.ok(Math.abs(Math.atan2(Math.sin(turn - Math.PI), Math.cos(turn - Math.PI))) < .05, 'face to face');
  assert.equal(lifePresentation(h.orange).title, '和小白碰碰鼻子');
  until(h, () => h.orange.together.motionTime >= 1.4);
  const touch = nose(h.orange).distanceTo(nose(h.white));
  assert.ok(touch < .012, `noses ${touch.toFixed(3)} apart`);
  assert.ok(headCentre(h.orange).distanceTo(headCentre(h.white)) > .5, 'heads stay apart');
  until(h, () => free(h), 10);
  assert.equal(h.orange.source, 'Autonomous'); assert.equal(h.white.source, 'Autonomous');
  const lines = h.journal.entries.filter(entry => entry.kind === 'Boop');
  assert.equal(lines.length, 1); assert.equal(lines[0].who, '小橘和小白'); assert.equal(lines[0].source, 'player');
  h.orange.dispose(); h.white.dispose();
});

test('gazing together: holding hands side by side at the clear window spot, both look out, and it is never logged as a window visit', () => {
  const h = home();
  const { scene } = createScene({ expanded: true, garden: true, kitchen: true });
  scene.updateMatrixWorld(true);
  const blockers = [];
  scene.traverse(o => { if (o instanceof THREE.Mesh) { const box = new THREE.Box3().setFromObject(o, true); if (box.max.y > .02) blockers.push({ name: o.name, box: box.expandByScalar(-.01) }); } });
  assert.equal(h.pairs.invite('GazeTogether', h.white), 'accepted');
  until(h, () => both(h, 'active'));
  assert.equal(h.orange.state, 'Observe'); assert.equal(h.white.state, 'Observe');
  const xs = [h.orange.root.position.x, h.white.root.position.x].sort((p, q) => p - q);
  assert.ok(Math.abs(xs[0] + PAIR.GazeTogether.gap / 2) < .04 && Math.abs(xs[1] - PAIR.GazeTogether.gap / 2) < .04, xs.join());
  for (const fox of [h.orange, h.white]) {
    assert.ok(Math.abs(fox.root.position.z + 1.4) < .04, `${fox.name} z ${fox.root.position.z}`);
    const facing = Math.atan2(Math.sin(fox.root.rotation.y - Math.PI), Math.cos(fox.root.rotation.y - Math.PI));
    assert.ok(Math.abs(facing) < .05, `${fox.name} faces ${fox.root.rotation.y}`);
    fox.root.updateMatrixWorld(true);
    const body = new THREE.Box3().setFromObject(fox.root, true);
    for (const { name, box } of blockers) assert.ok(!body.intersectsBox(box), `${fox.name} clips ${name}`);
  }
  assert.equal(lifePresentation(h.white).title, '和小橘並肩看著窗外');
  until(h, () => h.white.together.motionTime >= 1);
  // Holding hands: the inner paws meet with a relaxed reach, and the leaning heads never bump ears.
  let frame = 0, paws = 0, ears = Infinity, raise = 0;
  until(h, () => h.white.together.motionTime >= 6, 10, () => {
    if (frame++ % 12) return;
    paws = Math.max(paws, paw(h.orange, h.white).distanceTo(paw(h.white, h.orange)));
    ears = Math.min(ears, apart(surface(h.orange.root.getObjectByName('FoxHead')), surface(h.white.root.getObjectByName('FoxHead'))));
    raise = Math.max(raise, ...[[h.orange, h.white], [h.white, h.orange]].map(([fox, other]) => Math.abs(innerArm(fox, other).rotation.z)));
    if (h.white.together.motionTime >= 2.6 && h.white.together.motionTime < 3) {
      const lean = [h.orange, h.white].map(fox => fox.root.getObjectByName('FoxHead').rotation.z);
      assert.ok(lean[0] * lean[1] < 0, 'heads lean toward each other');
    }
  });
  assert.ok(paws < .012, `paws ${paws.toFixed(3)} apart`);
  assert.ok(ears > .01, `heads ${ears.toFixed(3)} apart`);
  assert.ok(raise < 1, `arm raised ${raise.toFixed(2)}`);
  assert.ok(Math.abs(h.orange.root.position.distanceTo(h.white.root.position) - PAIR.GazeTogether.gap) < .002, 'stepped onto the exact spots');
  until(h, () => free(h), 12);
  assert.equal(h.journal.entries.filter(entry => entry.kind === 'GazeTogether' && entry.who === '小白和小橘').length, 1);
  assert.equal(h.journal.entries.filter(entry => entry.kind === 'Window').length, 0);
  h.orange.dispose(); h.white.dispose();
});

test('a pair is turned down while either fox finishes your invitation, and a busy fox finishes safely before joining', () => {
  const h = home({ b: lcg(5) });
  assert.equal(h.orange.requestRead(), true);
  assert.equal(h.pairs.invite('Boop', h.orange), 'self-busy');
  assert.equal(h.pairs.invite('Boop', h.white), 'partner-busy');
  assert.equal(h.white.together, null); assert.notEqual(h.orange.readPhase, null);
  until(h, () => h.orange.state === 'Idle' && h.orange.source === 'Autonomous', 30);
  // Let the white fox start something of its own, then invite a pair while it is under way.
  until(h, () => h.white.source === 'Autonomous' && !['Idle', 'Walk', 'Observe'].includes(h.white.state), 400);
  const busy = h.white.state;
  assert.equal(h.pairs.invite('Boop', h.orange), 'accepted');
  assert.equal(h.white.together, null, 'the white fox first finishes what it was doing');
  assert.equal(h.white.source, 'Player Command');
  until(h, () => both(h, 'active'), 90);
  assert.ok(busy, 'reached a busy state');
  until(h, () => free(h), 10);
  h.orange.dispose(); h.white.dispose();
});

test('when one fox is called away the other ends the pair too, before or after arriving, and nobody is left waiting', () => {
  for (const when of ['approach', 'active']) {
    const h = home({ pairs: () => 0 });
    h.white.root.position.set(1, 0, .6);
    step(h, dt);
    assert.ok(h.orange.together && h.white.together, 'two idle foxes in one room start a pair on their own');
    assert.equal(h.orange.source, 'Autonomous');
    if (when === 'active') until(h, () => both(h, 'active'));
    assert.equal(h.orange.requestRead(), true);
    step(h, .1);
    if (when === 'approach') assert.equal(h.white.together, null, 'the white fox stops walking over at once');
    until(h, () => h.white.state === 'Idle' && !h.white.together, 5);
    until(h, () => h.orange.readPhase === 'read', 30);
    h.orange.dispose(); h.white.dispose();
  }
});

test('the house starts pairs on its own only for two free foxes in one room, then rests', () => {
  const h = home({ a: lcg(7), b: lcg(19), pairs: () => 0 });
  step(h, dt);
  assert.equal(h.orange.together, null, 'different rooms: no pair');
  h.white.root.position.set(1, 0, .6);
  assert.equal(h.orange.requestRead(), true);
  step(h, dt);
  assert.equal(h.white.together, null, 'one fox finishing your invitation: no pair');
  // Check the foxes right before the house decides: a pair may only begin when both are free in one room.
  let start = null;
  for (let i = 0; i < 300 / dt && !start; i++) {
    h.orange.update(dt); h.white.update(dt);
    const before = { free: h.orange.free && h.white.free, same: roomAt(h.orange.root.position) === roomAt(h.white.root.position) };
    const had = !!h.orange.together;
    h.pairs.update(dt);
    if (!had && h.orange.together) start = before;
  }
  assert.ok(start, 'a pair started');
  assert.ok(start.free && start.same, JSON.stringify(start));
  until(h, () => free(h), 30);
  let again = false;
  step(h, PAIR.rest - 15, () => { if (h.orange.together) again = true; });
  assert.equal(again, false, 'rests between pairs');
  h.orange.dispose(); h.white.dispose();
});

test('over a long autonomous run pairs happen, never deadlock in waiting, and the two never share a single-fox spot', () => {
  const h = home({ a: lcg(44), b: lcg(116), pairs: lcg(12) });
  let pairsSeen = 0, waiting = { orange: 0, white: 0 }, previous = null;
  const group = fox => fox.kitchenActivity ? 'kitchen' : fox.gardenActivity ? 'garden' : fox.livingActivity ? 'living'
    : fox.readPhase ? 'reading' : fox.eatPhase ? 'dining' : fox.activityKind === 'Clean' ? 'cleaning' : null;
  step(h, 1200, () => {
    const now = h.orange.together?.kind ?? null;
    if (now && now !== previous) pairsSeen++;
    previous = now;
    for (const [key, fox] of [['orange', h.orange], ['white', h.white]]) {
      waiting[key] = fox.together?.phase === 'wait' ? waiting[key] + dt : 0;
      assert.ok(waiting[key] <= PAIR.patience + .1, `${key} waited too long`);
    }
    const a = group(h.orange), b = group(h.white);
    const sharedTV = a === 'living' && h.orange.together?.kind === 'WatchTVTogether' && h.white.together?.kind === 'WatchTVTogether';
    assert.ok(!a || a !== b || sharedTV, `unrelated activities both in ${a}`);
  });
  assert.ok(pairsSeen >= 2, `pairs seen: ${pairsSeen}`);
  h.orange.dispose(); h.white.dispose();
});

test('follow mode leans the view toward the chosen fox and drifts with it, keeping your orbit', () => {
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 80);
  camera.position.set(8, 7, 10);
  const controls = { target: new THREE.Vector3(0, .8, 0), addEventListener() {}, removeEventListener() {} };
  const orange = new THREE.Vector3(1.2, 0, -.8), white = new THREE.Vector3(-1, 0, 6.5);
  const view = createHomeView(camera, controls, orange, () => false, true);
  view.focus('follow');
  for (let i = 0; i < 400; i++) view.update(dt);
  const expected = (room, fox) => new THREE.Vector3(homeRooms[room].centerX + FOLLOW_BIAS * (fox.x - homeRooms[room].centerX), .8,
    homeRooms[room].centerZ + FOLLOW_BIAS * (fox.z - homeRooms[room].centerZ));
  assert.ok(controls.target.distanceTo(expected('Bedroom', orange)) < .01);
  const offset = camera.position.clone().sub(controls.target);
  orange.set(-1.4, 0, 1.1);
  for (let i = 0; i < 400; i++) view.update(dt);
  assert.ok(controls.target.distanceTo(expected('Bedroom', orange)) < .01, 'drifts with the fox');
  assert.ok(camera.position.clone().sub(controls.target).distanceTo(offset) < 1e-6, 'orbit and zoom unchanged');
  view.follow(white);
  for (let i = 0; i < 600; i++) view.update(dt);
  assert.equal(view.room, 'LivingRoom');
  assert.ok(controls.target.distanceTo(expected('LivingRoom', white)) < .01, 'switching fox moves to its room');
  view.focus('Kitchen');
  for (let i = 0; i < 600; i++) view.update(dt);
  const fixed = controls.target.clone();
  white.set(1, 0, 5);
  for (let i = 0; i < 200; i++) view.update(dt);
  assert.ok(controls.target.distanceTo(fixed) < 1e-9, 'a fixed room view does not drift');
});
