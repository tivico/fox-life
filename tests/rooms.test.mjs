import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, expandedHomeLayout } from '../src/scene.ts';
import { roomAt } from '../src/HomeNavigation.ts';
import { createHomeView, FOLLOW_BIAS } from '../src/HomeView.ts';
import { LifeJournal } from '../src/life.ts';
import { SoundCues } from '../src/SoundCues.ts';

function until(fox, predicate, dt = 1 / 60, sample = () => {}, seconds = 100) {
  for (let i = 0; i < seconds / dt; i++) {
    fox.update(dt); sample();
    if (predicate()) return;
  }
  assert.fail(`action stalled: ${fox.action}, ${fox.root.position.toArray()}`);
}

test('visiting each room crosses the doorway, records the actual room and preserves command exclusivity', () => {
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
    const fox = new Character(expandedHomeLayout, () => .45), journal = new LifeJournal();
    const visits = [];
    const sample = () => {
      if (fox.root.position.z > 2.8 && fox.root.position.z < 3.6) {
        assert.ok(Math.abs(fox.root.position.x) < .3, 'cross the open center, never the divider');
      }
      journal.observe(fox);
    };
    for (const room of ['LivingRoom', 'Bedroom']) {
      assert.equal(fox.requestRoomVisit(room), true);
      assert.equal(fox.requestSleep(), false);
      assert.equal(fox.requestRoomVisit(room), false);
      until(fox, () => fox.state === 'Observe', dt, sample);
      assert.equal(roomAt(fox.root.position), room);
      visits.push(journal.entries[0].kind);
      until(fox, () => fox.state === 'Idle', dt, sample);
    }
    assert.deepEqual(visits, ['LivingRoom', 'Bedroom']);
    assert.equal(journal.entries.length, 2);
    assert.ok(!journal.entries.some(entry => entry.kind === 'Window'));
    fox.dispose();
  }
});

test('all six bedroom/house invitations complete from the living room without getting trapped at the doorway', () => {
  for (const request of ['requestSleep', 'requestRead', 'requestEat', 'requestClean', 'requestPlay', 'requestWindowObserve']) {
    const fox = new Character(expandedHomeLayout, () => .45);
    fox.root.position.set(.8, 0, 6.3); fox.root.rotation.y = 1.5;
    assert.equal(fox[request](), true);
    let active = false;
    until(fox, () => fox.state === 'Idle', 1 / 60, () => {
      active ||= ['Sleep', 'Read', 'Eat', 'Clean', 'Living', 'Observe'].includes(fox.state);
      if (fox.root.position.z > 2.8 && fox.root.position.z < 3.6) assert.ok(Math.abs(fox.root.position.x) < .3);
    });
    assert.ok(active, request);
    assert.equal(roomAt(fox.root.position), request === 'requestPlay' ? 'LivingRoom' : 'Bedroom');
    assert.equal(fox.cleanToolInUse, false);
    fox.dispose();
  }
});

test('room invitations finish the current autonomous pose and put the broom away before crossing', () => {
  for (const active of ['Sleep', 'Read', 'Clean']) {
    let seed = 42;
    const fox = new Character(expandedHomeLayout, () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296));
    until(fox, () => fox.state === active, .05, () => {}, 600);
    assert.equal(fox.source, 'Autonomous');
    assert.equal(fox.requestRoomVisit('LivingRoom'), true);
    let crossed = false;
    until(fox, () => fox.state === 'Observe', 1 / 60, () => {
      if (fox.root.position.z > 3.2) { crossed = true; assert.equal(fox.cleanToolInUse, false); }
    });
    assert.ok(crossed); assert.equal(roomAt(fox.root.position), 'LivingRoom'); fox.dispose();
  }
});

test('the animated exercising fox clears the new furniture and doorway on cross-room journeys', () => {
  const { scene } = createScene({ expanded: true });
  const blockers = [];
  scene.getObjectByName('LivingRoom').traverse(object => {
    if (object instanceof THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(object, true);
      if (box.max.y > .05) blockers.push({ box, name: object.name });
    }
  });
  for (const dt of [.05, 1 / 60]) for (const start of [[-3.15, 0, 1.85], [1.6, 0, -1.1], [-1.6, 0, 7]]) {
    const fox = new Character(expandedHomeLayout, () => .45); fox.root.position.fromArray(start);
    let frame = 0;
    const sample = () => {
      if (frame++ % 6 || fox.root.position.z < 2.3) return;
      fox.root.updateMatrixWorld(true);
      fox.root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        let ancestor = object;
        while (ancestor && ancestor.visible) ancestor = ancestor.parent;
        if (ancestor) return;
        const box = new THREE.Box3().setFromObject(object, true);
        for (const blocker of blockers) assert.ok(!box.intersectsBox(blocker.box), `${fox.action}: ${object.parent?.name} hits ${blocker.name}`);
      });
    };
    fox.requestPlay(); until(fox, () => fox.state === 'Idle', dt, sample);
    fox.requestWindowObserve(); until(fox, () => fox.state === 'Idle', dt, sample); fox.dispose();
  }
});

test('ten minutes of autonomous life use both rooms, complete activities and remain finite', () => {
  let seed = 42;
  const fox = new Character(expandedHomeLayout, () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296));
  const rooms = new Set(), states = new Set(); let previous = fox.root.position.clone();
  for (let i = 0; i < 600 * 20; i++) {
    fox.update(.05); rooms.add(roomAt(fox.root.position)); states.add(fox.state);
    assert.ok(fox.root.position.toArray().every(Number.isFinite));
    assert.ok(fox.root.position.distanceTo(previous) < .06, 'no teleport between rooms');
    previous.copy(fox.root.position);
    if (fox.root.position.z > 2.8 && fox.root.position.z < 3.6) assert.ok(Math.abs(fox.root.position.x) < .35);
  }
  assert.deepEqual([...rooms].sort(), ['Bedroom', 'LivingRoom']);
  for (const state of ['Sleep', 'Read', 'Eat', 'Clean', 'Living']) assert.ok(states.has(state), state);
  assert.ok(!states.has('Play'), 'the expanded home has exercise instead of yarn');
  fox.dispose();
});

test('camera smoothly follows room crossings, manual views stay selected and reduced motion finishes directly', () => {
  const camera = new THREE.PerspectiveCamera(); camera.position.set(8, 7, 10);
  const controls = new THREE.EventDispatcher(); controls.target = new THREE.Vector3(0, .8, 0);
  const position = new THREE.Vector3(); let reduced = false;
  const view = createHomeView(camera, controls, position, () => reduced);
  position.z = 6.2; const before = camera.position.clone(); view.update(1 / 60);
  assert.equal(view.room, 'LivingRoom'); assert.ok(camera.position.distanceTo(before) > 0);
  assert.ok(camera.position.distanceTo(before) < 1, 'no camera snap');
  // Following leans the view from the room's centre toward the fox.
  for (let i = 0; i < 120; i++) view.update(1 / 60);
  assert.ok(Math.abs(controls.target.z - (6.4 + FOLLOW_BIAS * (6.2 - 6.4))) < .01);
  view.focus('Bedroom'); position.z = 6.8;
  for (let i = 0; i < 120; i++) view.update(1 / 60);
  assert.equal(view.mode, 'Bedroom'); assert.ok(Math.abs(controls.target.z) < .01);
  reduced = true; view.focus('follow'); view.update(1 / 60);
  assert.ok(Math.abs(controls.target.z - (6.4 + FOLLOW_BIAS * (6.8 - 6.4))) < 1e-9);
  view.focus('overview'); view.update(1 / 60); assert.equal(controls.target.z, 3.2);
  view.dispose();
});

test('expanded room has a clear physical doorway, television and exercise mat instead of yarn', () => {
  const { scene, playParts, loungeParts } = createScene({ expanded: true });
  assert.ok(scene.getObjectByName('LivingRoomFloor')); assert.ok(scene.getObjectByName('SofaBase'));
  assert.ok(loungeParts.length > 5);
  assert.equal(scene.getObjectsByProperty('name', 'RoomYarn').length, 0);
  assert.ok(scene.getObjectByName('Television')); assert.ok(scene.getObjectByName('ExerciseMat'));
  assert.ok(playParts.every(part => part.getWorldPosition(new THREE.Vector3()).z > 5));
  const doorway = new THREE.Box3(new THREE.Vector3(-1.2, .04, 2.95), new THREE.Vector3(1.2, 2, 3.45));
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) assert.ok(!new THREE.Box3().setFromObject(object).intersectsBox(doorway), object.name);
  });
});

test('living room rug has soft footsteps and zero time never advances a room journey', () => {
  const fox = new Character(expandedHomeLayout, () => .45), cues = new SoundCues();
  fox.requestPlay(); const heard = [];
  until(fox, () => fox.livingActivity?.phase === 'active', 1 / 60, () => {
    const sounds = cues.update(fox, 1 / 60);
    if (fox.root.position.z > 5) heard.push(...sounds);
  });
  assert.ok(heard.includes('step-rug'));
  const position = fox.root.position.clone(), elapsed = fox.livingActivity.elapsed;
  for (let i = 0; i < 100; i++) fox.update(0);
  assert.ok(fox.root.position.equals(position)); assert.equal(fox.livingActivity.elapsed, elapsed); fox.dispose();
});
