import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { homeLayout } from '../src/scene.ts';
import { PET } from '../src/pet.ts';
import { LifeJournal } from '../src/life.ts';
import { bindClickInteraction } from '../src/ClickInteraction.ts';

const dt = 1 / 60;
const lcg = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const step = (fox, seconds, each = () => {}) => { for (let i = 0; i < Math.round(seconds / dt); i++) { fox.update(dt); each(); } };
function until(fox, predicate, seconds = 90) {
  let elapsed = 0;
  while (!predicate() && elapsed < seconds) { fox.update(dt); elapsed += dt; }
  assert.ok(predicate(), `timed out: ${fox.action}`);
}
const transforms = object => {
  const out = [];
  object.traverse(node => out.push(node.name, ...node.position.toArray(), ...node.rotation.toArray().slice(0, 3),
    ...node.scale.toArray(), ...(node.morphTargetInfluences ?? [])));
  return out;
};

test('a pat never changes what the fox is doing, and the pose returns exactly to baseline', () => {
  const petted = new Character(homeLayout, lcg(7)), twin = new Character(homeLayout, lcg(7));
  const headA = petted.root.getObjectByName('FoxHead'), headB = twin.root.getObjectByName('FoxHead');
  const taps = lcg(3);
  let nextTap = 1, peakChecked = false;
  const kinds = new Set();
  for (let frame = 0; frame < 200 / dt; frame++) {
    const t = frame * dt;
    if (t >= nextTap) { kinds.add(petted.pet()); nextTap = t + .4 + taps() * 5; }
    petted.update(dt); twin.update(dt);
    assert.equal(petted.state, twin.state); assert.equal(petted.action, twin.action); assert.equal(petted.source, twin.source);
    assert.deepEqual(petted.root.position.toArray(), twin.root.position.toArray());
    assert.equal(petted.root.rotation.y, twin.root.rotation.y);
    const reaction = petted.petReaction;
    if (reaction?.kind === 'nuzzle' && Math.abs(reaction.time - .6) < dt / 2) {
      assert.ok(Math.abs(headA.rotation.z - headB.rotation.z) > .08, 'the head leans into the hand'); peakChecked = true;
    }
    if (!reaction && frame % 30 === 0) assert.deepEqual(transforms(petted.root), transforms(twin.root));
  }
  assert.ok(kinds.has('nuzzle') && kinds.has('glance'), [...kinds].join());
  assert.ok(peakChecked);
  petted.dispose(); twin.dispose();
});

test('the reaction follows the fox: nuzzle when free, a glance while busy, an ear flick when asleep', () => {
  const fox = new Character(homeLayout, () => .45), twin = new Character(homeLayout, () => .45);
  assert.equal(fox.state, 'Idle');
  assert.equal(fox.pet(), 'nuzzle');
  assert.equal(fox.petReaction.kind, 'nuzzle'); assert.equal(fox.state, 'Idle'); assert.equal(fox.target, null);
  for (const c of [fox, twin]) assert.equal(c.requestRead(), true);
  assert.equal(fox.pet(), 'glance');
  until(fox, () => fox.readPhase === 'read'); until(twin, () => twin.readPhase === 'read');
  assert.equal(fox.pet(), 'glance'); assert.equal(fox.readPhase, 'read');
  until(fox, () => fox.state === 'Idle'); until(twin, () => twin.state === 'Idle');
  for (const c of [fox, twin]) assert.equal(c.requestSleep(), true);
  until(fox, () => fox.sleepPhase === 'sleep'); until(twin, () => twin.sleepPhase === 'sleep');
  assert.equal(fox.pet(), 'twitch');
  step(fox, .15); step(twin, .15);
  const head = fox.root.getObjectByName('FoxHead'), twinHead = twin.root.getObjectByName('FoxHead');
  assert.deepEqual(head.rotation.toArray(), twinHead.rotation.toArray(), 'the head stays on the pillow');
  assert.deepEqual(fox.root.getObjectByName('FoxEyes').scale.toArray(), twin.root.getObjectByName('FoxEyes').scale.toArray(), 'eyes stay closed');
  assert.notDeepEqual(transforms(head), transforms(twinHead), 'an ear flicks');
  assert.equal(fox.sleepPhase, 'sleep');
  step(fox, PET.duration.twitch); assert.equal(fox.petReaction, null);
  fox.dispose(); twin.dispose();
});

test('five taps within eight seconds make the fox shy; it forgives after the spell and forgets old taps', () => {
  const fox = new Character(homeLayout, () => .45);
  for (let i = 0; i < PET.shyAfter - 1; i++) { assert.notEqual(fox.pet(), 'shy'); step(fox, 1); }
  assert.equal(fox.pet(), 'shy');
  step(fox, .5);
  const before = fox.petReaction.time;
  assert.equal(fox.pet(), 'shy');
  assert.equal(fox.petReaction.time, before, 'a tap during the shy spell neither restarts nor extends it');
  step(fox, PET.duration.shy);
  assert.equal(fox.petReaction, null);
  assert.notEqual(fox.pet(), 'shy', 'forgiven');
  fox.dispose();
  const slow = new Character(homeLayout, () => .45);
  for (let i = 0; i < PET.shyAfter - 1; i++) { slow.pet(); step(slow, 1); }
  step(slow, PET.burstWindow);
  for (let i = 0; i < PET.shyAfter - 1; i++) { assert.notEqual(slow.pet(), 'shy', 'old taps have expired'); step(slow, .5); }
  assert.equal(slow.pet(), 'shy');
  slow.dispose();
});

test('the journal keeps one line per burst of pats and one for turning away', () => {
  const fox = new Character(homeLayout, () => .45), journal = new LifeJournal();
  let tick = 0;
  const run = seconds => step(fox, seconds, () => journal.observe(fox, 1_700_000_000_000 + tick++));
  const count = kind => journal.entries.filter(entry => entry.kind === kind).length;
  fox.pet(); run(.5); fox.pet(); run(.5); fox.pet(); run(3);
  assert.equal(count('Pet'), 1); assert.equal(count('PetShy'), 0);
  for (let i = 0; i < PET.shyAfter; i++) { fox.pet(); run(.3); }
  assert.equal(count('Pet'), 2); assert.equal(count('PetShy'), 1);
  run(PET.duration.shy);
  fox.pet(); run(.1);
  assert.equal(count('Pet'), 3);
  assert.ok(journal.entries.filter(entry => entry.kind.startsWith('Pet')).every(entry => entry.source === 'player'));
  assert.deepEqual(new LifeJournal(JSON.parse(JSON.stringify(journal.entries))).entries, journal.entries, 'pats survive a reload');
  fox.dispose();
});

test('tapping the fox through the click binder pats it; empty space, drags and occluders do not', () => {
  class Canvas extends EventTarget { getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 400 }; } }
  const canvas = new Canvas();
  const scene = new THREE.Scene();
  const fox = new Character(homeLayout, () => .45);
  scene.add(fox.root);
  fox.update(dt);
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 50);
  camera.position.set(0, 1.2, 3.2); camera.lookAt(0, .75, 0);
  const parts = [];
  fox.root.traverse(object => { if (object instanceof THREE.Mesh) parts.push(object); });
  let pats = 0;
  const dispose = bindClickInteraction(canvas, camera, scene, parts, () => { fox.pet(); pats++; });
  const event = (type, x, y) => {
    const value = new Event(type);
    Object.assign(value, { clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true });
    canvas.dispatchEvent(value);
  };
  const click = (x, y) => { event('pointerdown', x, y); event('pointerup', x, y); };
  click(200, 200);
  assert.equal(pats, 1); assert.equal(fox.petReaction?.kind, 'nuzzle');
  click(20, 20);
  event('pointerdown', 200, 200); event('pointermove', 240, 200); event('pointerup', 200, 200);
  assert.equal(pats, 1, 'empty space and drags are not pats');
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(3, 3, .1));
  blocker.position.set(0, .75, 1.5); scene.add(blocker);
  click(200, 200);
  assert.equal(pats, 1, 'furniture in front of the fox takes the click instead');
  scene.remove(blocker); dispose();
  click(200, 200);
  assert.equal(pats, 1, 'listeners are removed');
  fox.dispose();
});
